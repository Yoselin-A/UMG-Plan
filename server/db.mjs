import 'dotenv/config';
import sql from 'mssql/msnodesqlv8.js';

// Windows authentication: SQL passwords never reach the browser.
export const pool = new sql.ConnectionPool({
 connectionString: process.env.SQL_CONNECTION_STRING || 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=UMGPlan_Dev;Trusted_Connection=Yes;TrustServerCertificate=Yes;',
 pool:{max:5,min:0,idleTimeoutMillis:30000}, requestTimeout:30000
});
export {sql};
export async function query(connection, text, values={}) {
 const request=new sql.Request(connection);
 for(const [key,value] of Object.entries(values)) {
  if(value===undefined||value===null) request.input(key,sql.NVarChar(sql.MAX),null);
  else if(typeof value==='boolean') request.input(key,sql.SmallInt,value?1:0);
  else if(typeof value==='number') request.input(key,sql.Decimal(18,4),value);
  else request.input(key,sql.NVarChar(sql.MAX),String(value));
 }
 return (await request.query(text)).recordset;
}
export async function transaction(work) {
 const tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try {const result=await work(tx);await tx.commit();return result;}
 catch(error){await tx.rollback().catch(()=>{});throw error;}
}
