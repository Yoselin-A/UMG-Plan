import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {build} from 'esbuild';
import Module from 'node:module';
import path from 'node:path';

test('Gestión académica abre los planes sin error',async()=>{
 const bundled=await build({stdin:{contents:"export {Catalogos} from './src/pages/Catalogos.jsx'; export {AppProvider} from './src/context/AppContext.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,jsx:'automatic',platform:'node',format:'cjs',packages:'external',write:false});
 const filename=path.join(process.cwd(),'.local','catalogos-test.cjs');
 const loaded=new Module(filename);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundled.outputFiles[0].text,filename);
 const {Catalogos,AppProvider}=loaded.exports;
 const tree=React.createElement(AppProvider,null,React.createElement(MemoryRouter,{initialEntries:['/catalogos/academica']},React.createElement(Routes,null,React.createElement(Route,{path:'/catalogos/:category',element:React.createElement(Catalogos)}))));
 const output=renderToString(tree);
 assert.match(output,/Gestión Académica/);
 assert.match(output,/Registros de planes de estudio y carreras/);
 assert.doesNotMatch(output,/Referencias públicas de UMG/);
});
