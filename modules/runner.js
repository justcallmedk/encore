require("dotenv").config();
const BBallAPI = require('./bball-api');

module.exports = class Runner{
  constructor() {
    this.api = new BBallAPI(process.env.BBALL_API_KEY);
    this.data = {};
    this.t = undefined;
  }

  process (rows) {
    let data = this.data;
    for(const row of rows) {
      //data check
      if( !row.scores || !row.id ||
          !row.timer || !row.timer.tm || !row.timer.q )
        continue;

      //skip completed
      if(row.timer.q === '2' && row.timer.tm === '0' && row.timer.ts === '0')
        continue;
      if(!data[row.id]) { //new
        data[row.id] = {
          home : row.home.name,
          away : row.away.name
        };
        data[row.id].scores = {};
        data[row.id].scores = {};
      }

      const homeScore = parseInt(row.scores['7'].home);
      const awayScore = parseInt(row.scores['7'].away);
      const totalScore = homeScore + awayScore;
      data[row.id].current_score = {
        home : homeScore,
        away : awayScore
      }

      const timer = row.timer;
      data[row.id].time = timer;
      const minute = 20 - timer.tm + (timer.q === '2' ? 20 : 0);

      //scores calculation
      let scores = data[row.id].scores[minute];
      if (!scores) {
        scores = {
          arr: [],
          ppm: 0
        }
      }
      const lastScore = scores.arr.slice(-1)[0];
      if (lastScore !== totalScore) {
        scores.arr.push(homeScore + awayScore);
        scores.arr = scores.arr.sort();
      }
      if (scores.arr.length > 1) {
        scores.ppm = scores.arr.slice(-1)[0] - scores.arr[0];
      }
      data[row.id].scores[minute] = scores;

      //ppm and proojection calculation
      let scoresKeys = Object.keys(data[row.id].scores).sort();
      let ppm1 = -1, ppm5 = -1, ppm0 = -1;
      if(scoresKeys.length > 1) {
        scoresKeys.pop();
        scoresKeys = scoresKeys.reverse();
        ppm1 = data[row.id].scores[scoresKeys[0]].ppm;

        let counter = 0, ppm5_ = 0;
        for(const key of scoresKeys) {
          ppm5_ += data[row.id].scores[key].ppm;
          counter++;
          if(counter === 4) {
            ppm5 = ppm5_ / 5;
          }
        }
        ppm0 = ppm5_ / minute;
      }
      const remainingMinutes = 40 - minute;
      data[row.id].ppm = {
        ppm1 : { points : ppm1, projection : (remainingMinutes * ppm1) + totalScore},
        ppm5 : { points : ppm5, projection : (remainingMinutes * ppm5) + totalScore},
        ppm0 : { points : ppm0, projection : (remainingMinutes * ppm0) + totalScore}
      }
    }
    return data;
  }

  async test () {
    if(!this.leagueId) {
      this.leagueId = (await this.api.getLeague('NCAAB')).id;
    }
    const data = await this.api.getInplayEvents(this.leagueId);
    return data;
  }

  async start (io) {
    console.log('start!');
    if(!this.leagueId) {
      this.leagueId = (await this.api.getLeague('NCAAB')).id;
    }

    let interval = 3000;
    const func = async () => {
      let data = await this.api.getInplayEvents(this.leagueId);
      if(data.length === 0) {
        console.log('changing interval to 60 seconds');
        interval = 60000;
      }
      else {
        console.log('changing interval to 3 seconds');
        data = this.process(data);
        interval = 3000;
        io.emit('pong', data);
      }

      this.t = setTimeout(await func, interval);
    }
    this.t = setTimeout(await func, interval);
  }

  stop() {
    clearInterval(this.t);
  }
}