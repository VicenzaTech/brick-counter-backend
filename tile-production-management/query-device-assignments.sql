SELECT 
    ps.id, 
    ps.name AS stage_name, 
    ps."order", 
    p.id AS position_id, 
    p.name AS position_name, 
    p.index AS position_index, 
    d.id AS device_id, 
    d."deviceId", 
    d.name AS device_name
FROM production_stages ps
LEFT JOIN positions p ON p."productionStageId" = ps.id
LEFT JOIN devices d ON d."positionId" = p.id
WHERE ps."productionLineId" = 1
ORDER BY ps."order", p.index, d.id;
