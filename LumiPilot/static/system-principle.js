import {mountIndustrial} from './system-industrial.js?v=82408b67ba10';
import './system-principle-embed.js?v=82408b67ba10';
const params=new URLSearchParams(location.search);document.body.classList.add('iso');document.body.dataset.theme='light';if(params.get('embed')==='1')document.body.classList.add('sp-embedded');
const bench=mountIndustrial(document.querySelector('#sp-stage-explorer'));
const focus=params.get('focus');if(focus&&focus!=='overview')bench.setLayer(focus);
document.addEventListener('sp-industrial-focus',e=>{document.body.dataset.layer=e.detail.layer;});
