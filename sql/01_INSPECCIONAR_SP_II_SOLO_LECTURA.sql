-- UMG Plan / SP-II. SOLO CONSULTAS; NO CREA NI MODIFICA TABLAS.
-- Ejecutar en SQL Server Management Studio DESPUÉS de restaurar una COPIA de SP_II.bak.
-- Elegir manualmente la base RESTAURADA (no ejecutar sobre producción por error).
-- Este archivo ayuda a verificar el esquema real frente al modelo conceptual.
SELECT DB_NAME() AS base_actual;
SELECT s.name AS esquema, t.name AS tabla, c.column_id AS orden,
       c.name AS columna, ty.name AS tipo_dato, c.max_length AS tamano,
       c.precision, c.scale, c.is_nullable AS permite_nulo, c.is_identity AS identidad
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id=t.schema_id
JOIN sys.columns AS c ON c.object_id=t.object_id
JOIN sys.types AS ty ON ty.user_type_id=c.user_type_id
ORDER BY s.name,t.name,c.column_id;

SELECT fk.name AS restriccion,
       OBJECT_SCHEMA_NAME(fk.parent_object_id) AS esquema_origen,
       OBJECT_NAME(fk.parent_object_id) AS tabla_origen,
       pc.name AS columna_origen,
       OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS esquema_destino,
       OBJECT_NAME(fk.referenced_object_id) AS tabla_destino,
       rc.name AS columna_destino
FROM sys.foreign_keys AS fk
JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id=fk.object_id
JOIN sys.columns AS pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
JOIN sys.columns AS rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id
ORDER BY tabla_origen,fk.name;

SELECT SCHEMA_NAME(t.schema_id) AS esquema,t.name AS tabla,i.name AS indice,
       i.is_primary_key,i.is_unique,c.name AS columna,ic.key_ordinal
FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id
JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id
WHERE i.is_primary_key=1 OR i.is_unique=1
ORDER BY t.name,i.name,ic.key_ordinal;

SELECT SCHEMA_NAME(t.schema_id) AS esquema,t.name AS tabla,
       SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) AS filas_estimadas
FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id
GROUP BY t.schema_id,t.name ORDER BY t.name;
