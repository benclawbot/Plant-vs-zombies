export class Soundtrack {
 constructor(createAudio=src=>new Audio(src)){
  this.tracks={intro:createAudio('/audio/crazy-dave.mp3'),garden:createAudio('/audio/grasswalk.mp3')};
  for(const audio of Object.values(this.tracks)){audio.loop=true;audio.preload='metadata';audio.volume=.25;}
  this.track='intro';this.volume=.25;this.paused=false;this.unlocked=false;
 }
 unlock(){this.unlocked=true;this.sync();}
 set(track,volume,paused=false){
  volume=Math.max(0,Math.min(1,volume));if(track===this.track&&volume===this.volume&&paused===this.paused)return;
  if(track!==this.track){const old=this.tracks[this.track];old.pause();old.currentTime=0;this.track=track;}
  this.volume=volume;this.paused=paused;this.sync();
 }
 sync(){const audio=this.tracks[this.track];audio.volume=this.volume;if(!this.unlocked||this.paused||this.volume===0)audio.pause();else audio.play().catch(()=>{});}
}
