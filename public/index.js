const isDebug = window.location.href.endsWith('?debug');
if(isDebug)
  console.log('debugging ...');

const zeroPad = (n) => {
  return String(n).padStart(2, '0');
};

const updateTime = (game,key) => {
  let timeStr = '';
  if (game.time.tm === '20' && game.time.ts === '0') {
    timeStr += game.time.q === '1' ? 'PREGAME' : 'HALFTIME'
  } else if(game.time.tm === '-1') {
    timeStr += 'ENDED';
  } else {
    timeStr += game.time.q === '1' ? '1st ' : '2nd ';
    timeStr += zeroPad(game.time.tm) + ':' + zeroPad(game.time.ts);
  }
  const dot = game.time.tt === '0' ? '🔴' :  '🔵';
  const homeScore = game.current_score.home;
  const awayScore = game.current_score.away;
  const totalScore = homeScore + awayScore;
  let currentScore =  awayScore + ' : ' + homeScore + ' (' + totalScore + ')';

  $('#' + key + ' .time').html(timeStr);
  $('#' + key + ' .dot').html(dot);
  $('#' + key + ' .score').html(currentScore);

  const elapsedMinutes = Object.keys(game.scores).sort().pop();
  bookkeeper[key].total_score =  totalScore;
  bookkeeper[key].remaining_minutes = 40 - elapsedMinutes;
};

const updatePPM = (game,key) => {
  const arr = ['ppm1','ppm5','ppm0'];
  for(const ppmKey of arr) {
    const points = game.ppm[ppmKey].points <= 0 ? '' : game.ppm[ppmKey].points;
    const projection = game.ppm[ppmKey].projection <= 0 ? '' : game.ppm[ppmKey].projection;
    $('#' + key + ' .' + ppmKey + ' .points').html(Math.round(10 * points) / 10);
    $('#' + key + ' .' + ppmKey + ' .projection').html(Math.round(projection));
  }
};

const drawChart = (game,key) => {
  let chartTable = '<table class="chart">';
  for(let i = 0; i <= 10; i++) {
    chartTable += '<tr>';
    for (let j = 1; j <= 40 ; j++) {
      const even = j % 2 === 0 ? 'even' : 'odd';
      const coord = j + '-' + (9-i);
      if(i === 10) {
        chartTable += '<td class="x-legend ' + even + '">' + j + '</td>';
      } else {
        chartTable += '<td class="ppm-cell ' + even + ' ' + coord + '"></td>';
      }
    }
    chartTable += '</tr>';
  }
  chartTable += '</table>'
  $('#' + key + ' .chart').append($.parseHTML(chartTable));
};

const updateChart = (game,key) => {
  for(const cell in game.scores) {
    const ppm = Math.round(game.scores[cell].ppm);
    const coord = cell + - + ppm;
    if(bookkeeper[key].marked_cells[cell]) {
      continue;
    }
    const dom = $('#' + key + ' .' + coord);
    dom.html(ppm);
    dom.css('background-color', 'DeepSkyBlue');
    bookkeeper[key].marked_cells[cell] = true;
  }
};

const calculatePPM = (dom) => {
  const gameTable = dom.closest('.game-table');
  const key = gameTable.attr('id');
  const target = gameTable.find('.target').val();
  const totalScore = bookkeeper[key].total_score;
  if(target === '' || target < totalScore)
    return;
  const remainingMinutes = bookkeeper[key].remaining_minutes;
  const targetPPM = (target - totalScore) / remainingMinutes;
  gameTable.find('.target-ppm').html(targetPPM);
}

let bookkeeper = {};

$(document).ready(() => {
  //socket
  const protocol = "//";
  const host =  window.location.hostname;
  const port =  host === 'localhost' ? '8080' : '443';
  const socket = io.connect(protocol + host + ':' + port,{
    'sync disconnect on unload': true,
    secure:true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('pong', function(games){
    if(isDebug) {
      console.log(games);
    }
    $('#loading').hide();

    for(const key in games){
      const game = games[key];
      if(bookkeeper[key] && bookkeeper[key].rendered) {
        updateTime(game,key);
        updatePPM(game,key);
        updateChart(game,key);
        continue;
      }

      bookkeeper[key] = {
        rendered : true,
        marked_cells : {}
      }
      const title = game.away + ' @ ' + game.home;
      let table = $("#template").clone();
      table.attr('id',key);
      table.find('.title').text(title);
      table.show();
      $('#main').append(table);

      updateTime(game,key);
      drawChart(game,key);
      updatePPM(game,key);
    }
  });
});