export const rolePageSetionMappingQuery = `SELECT 
    p.id AS pageId,
    p.name AS pageName,
    s.id AS sectionId,
    s.name AS sectionName,
    r.id AS roleId,
    r.name AS roleName,
    rpm.id AS mappingId
FROM page_master p
LEFT JOIN section_master s ON s.page_id = p.id
CROSS JOIN rolemaster r
LEFT JOIN rolepagemapping rpm 
    ON rpm.pageId = p.id 
    AND rpm.sectionId = s.id 
    AND rpm.roleId = r.id
ORDER BY p.id, s.id, r.id `;
