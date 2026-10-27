import React from 'react';
import {AlertTriangle,CheckCircle2,Info,Plus,Search,Inbox} from 'lucide-react';
import {STATES} from '../lib/domain.mjs';
export {buildOptions as Options} from '../lib/selectOptions.mjs';
export function Card({children,className='',title,aside}){return <section className={`card ${className}`}>{(title||aside)&&<div className="card-heading"><h3>{title}</h3>{aside}</div>}{children}</section>}
export function PageHeading({title,subtitle,actions}){return <div className="page-heading"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div className="heading-actions">{actions}</div>}</div>}
export function Button({children,variant='primary',className='',...rest}){return <button className={`btn btn-${variant} ${className}`} {...rest}>{children}</button>}
export function Field({label,children,hint,required}){return <label className="field"><span className="field-label">{label}{required&&<b> *</b>}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function TextInput(props){return <input className="input" {...props}/>}
export function Select({value,onChange,options,placeholder='Seleccione una opción',disabled,required=false,className='',style,...props}){
 const [open,setOpen]=React.useState(false),[query,setQuery]=React.useState(null),[highlight,setHighlight]=React.useState(0);
 const input=React.useRef(null),listId=React.useId();
 const selected=options.find(o=>String(o.value)===String(value??''));
 const text=query===null?(selected?.label??''):query;
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const matches=query===null?options:options.filter(o=>normalize(o.label).includes(normalize(query.trim())));
 const choices=placeholder!=null&&(!query||!query.trim())?[{value:'',label:placeholder},...matches]:matches;
 React.useEffect(()=>{input.current?.setCustomValidity(query!==null?'Selecciona una opción de la lista.':required&&!value?'Selecciona una opción.':'')},[query,required,value]);
 const choose=o=>{onChange?.(String(o.value));setQuery(null);setOpen(false);setHighlight(0);input.current?.focus()};
 return <span className={`umg-combobox ${className}`} style={style} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setQuery(null)}}}>
  <input {...props} ref={input} className="input umg-combobox-input" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open&&choices[highlight]?listId+'-'+highlight:undefined} aria-required={required||undefined} autoComplete="off" placeholder={placeholder||'Buscar una opción'} disabled={disabled} value={text} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);setHighlight(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setHighlight(h=>Math.min(h+1,choices.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setOpen(true);setHighlight(h=>Math.max(h-1,0))}else if(e.key==='Enter'&&open&&choices[highlight]){e.preventDefault();choose(choices[highlight])}else if(e.key==='Escape'){setOpen(false);setQuery(null)}}}/>
  <button type="button" className="umg-combobox-toggle" aria-label="Mostrar opciones" tabIndex={-1} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(v=>!v);input.current?.focus()}}>▾</button>
  {open&&!disabled&&<span className="umg-combobox-list" id={listId} role="listbox">{choices.length?choices.map((o,i)=><span id={listId+'-'+i} role="option" aria-selected={String(o.value)===String(value??'')} className={i===highlight?'umg-combobox-option highlighted':'umg-combobox-option'} key={String(o.value)} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setHighlight(i)} onClick={()=>choose(o)}>{o.label}</span>):<span className="umg-combobox-empty">Sin resultados</span>}</span>}
 </span>
}
export function SearchableSelect({children,value,onChange,...props}){
 const optionText=node=>React.Children.toArray(node).map(child=>React.isValidElement(child)?optionText(child.props.children):String(child)).join('');
 const items=React.Children.toArray(children).filter(React.isValidElement).map(o=>({value:o.props.value??optionText(o.props.children),label:optionText(o.props.children)}));
 const empty=items.find(o=>o.value==='');
 return <Select {...props} value={value} onChange={v=>onChange?.({target:{value:v}})} placeholder={empty?.label??null} options={items.filter(o=>o.value!=='')}/>;
}
export function Status({status}){const k=String(status||'').toLowerCase();return <span className={`status status-${k}`}>{STATES[status]||({confirmada:'Confirmada',inconveniente:'Inconveniente',pendiente:'Pendiente'}[status]||status||'—')}</span>}
export function Empty({title='Sin registros',text='Aquí aparecerán los registros disponibles.'}){return <div className="empty"><Inbox size={30}/><strong>{title}</strong><p>{text}</p></div>}
export function Alert({children,type='info'}){const Icon=type==='danger'?AlertTriangle:type==='success'?CheckCircle2:Info;return <div className={`alert alert-${type}`}><Icon size={17}/><div>{children}</div></div>}
export function Table({columns,rows=[],empty='No se encontraron registros.',pageSize=12}){
 const [page,setPage]=React.useState(1),[query,setQuery]=React.useState(''),[sortIndex,setSortIndex]=React.useState(null),[ascending,setAscending]=React.useState(true);
 const textOf=v=>{if(v==null)return '';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);if(Array.isArray(v))return v.map(textOf).join(' ');if(React.isValidElement(v))return [v.props.status||'',textOf(v.props.children)].join(' ').trim();return ''};
 const content=(col,r)=>String(col.sortValue?col.sortValue(r):col.key!=null?r[col.key]:textOf(col.render?.(r))||'').toLowerCase();
 const filtered=rows.filter(r=>!query.trim()||columns.some(col=>content(col,r).includes(query.trim().toLowerCase())));
 const ordered=sortIndex==null?filtered:[...filtered].sort((a,b)=>(ascending?1:-1)*content(columns[sortIndex],a).localeCompare(content(columns[sortIndex],b),'es',{numeric:true}));
 React.useEffect(()=>setPage(1),[rows.length,query,sortIndex,ascending]);
 const pages=Math.max(1,Math.ceil(ordered.length/pageSize));const actual=Math.min(page,pages),visible=ordered.slice((actual-1)*pageSize,actual*pageSize);
 return <><div className="umg-simple-table-filter"><Search size={15}/><input placeholder="Filtrar registros de esta tabla…" aria-label="Filtrar tabla" value={query} onChange={e=>setQuery(e.target.value)}/><span>{ordered.length} registros</span></div><div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((c,i)=><th key={i}><button type="button" className="umg-th-sort" title={`Ordenar por ${c.label}`} onClick={()=>{if(sortIndex===i)setAscending(v=>!v);else{setSortIndex(i);setAscending(true)}}}>{c.label}{sortIndex===i?(ascending?' ↑':' ↓'):' ↕'}</button></th>)}</tr></thead><tbody>{visible.length?visible.map((row,i)=><tr key={row.id??i}>{columns.map((c,j)=><td key={j}>{c.render?c.render(row):row[c.key]??'—'}</td>)}</tr>):<tr><td colSpan={columns.length} className="table-empty">{empty}</td></tr>}</tbody></table></div>{ordered.length>pageSize&&<nav className="table-pagination" aria-label="Paginación de registros"><span>{ordered.length} registros · Página {actual} de {pages}</span><button type="button" disabled={actual<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>Anterior</button><button type="button" disabled={actual>=pages} onClick={()=>setPage(x=>Math.min(pages,x+1))}>Siguiente</button></nav>}</>;
}
export function MiniStat({icon:Icon,label,value,sub,tone='blue'}){return <div className="stat"><div className={`stat-icon ${tone}`}><Icon size={22}/></div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>}
export function Toolbar({search,setSearch,right}){return <div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Buscar registros…" value={search} onChange={e=>setSearch(e.target.value)}/></div>{right}</div>}
export function DangerConfirm({name,onConfirm}){return <Button variant="danger" type="button" onClick={()=>{if(window.confirm(`¿Seguro que deseas eliminar ${name}?`))onConfirm();}}>Eliminar</Button>}
export function Tabs({tabs,value,onChange}){return <div className="tabs">{tabs.map(t=><button type="button" className={value===t.value?'active':''} key={t.value} onClick={()=>onChange(t.value)}>{t.label}</button>)}</div>}
