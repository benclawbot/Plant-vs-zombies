import test from 'node:test';
import assert from 'node:assert/strict';
import {createPanelNavigation} from '../src/panel-navigation.js';
const fixture=()=>{const overlay={panel:true,querySelector(){return this.panel?{}:null;}};return {overlay,nav:createPanelNavigation(overlay)};};
test('Back, Escape with a focused input, and outside click invoke the same previous screen action',()=>{
 for(const exit of ['back','escape','outside']){const {overlay,nav}=fixture();let calls=0;nav.setBack((...args)=>{assert.equal(args.length,0);calls++;});let prevented=false;
 const handled=exit==='back'?nav.dismiss():exit==='escape'?nav.handleEscape({key:'Escape',target:{tagName:'INPUT'},preventDefault(){prevented=true;}}):nav.handleBackdropClick({target:overlay});
 assert.equal(handled,true);assert.equal(calls,1);assert.equal(nav.dismiss(),false);if(exit==='escape')assert.equal(prevented,true);
 }
});
test('clicking controls inside a modal never dismisses it',()=>{const {nav}=fixture();let calls=0;nav.setBack(()=>calls++);assert.equal(nav.handleBackdropClick({target:{tagName:'INPUT'}}),false);assert.equal(calls,0);assert.equal(nav.dismiss(),true);});
test('nested Options returns to Paused before Paused returns to play',()=>{
 const {nav}=fixture();let screen='play',running=true;
 const resume=()=>{screen='play';running=true;nav.clear();};
 const paused=()=>{screen='pause';running=false;nav.setBack(resume);};
 const options=()=>{screen='options';nav.setBack(paused);};
 const controls=()=>{screen='controls';nav.setBack(options);};
 paused();options();controls();nav.dismiss();assert.equal(screen,'options');nav.dismiss();assert.equal(screen,'pause');assert.equal(running,false);nav.dismiss();assert.equal(screen,'play');assert.equal(running,true);
});
test('no stale modal actions in gameplay or on the main menu, and other keys stay available',()=>{
 const {overlay,nav}=fixture();let calls=0;nav.setBack(()=>calls++);assert.equal(nav.handleEscape({key:'ArrowRight'}),false);assert.equal(nav.handleEscape({key:'Escape',isComposing:true}),false);overlay.panel=false;assert.equal(nav.dismiss(),false);overlay.panel=true;nav.clear();assert.equal(nav.handleBackdropClick({target:overlay}),false);assert.equal(calls,0);
});
