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

export const leadsMatrix = (userId: number) => ` SELECT 
            mel.id AS leadId,
            mel.fullName AS leadName,
            mel.address as address,
            mel.phoneNumber,
            COALESCE(mel.amount, 0) AS totalDealAmount,
            COALESCE(p_summary.totalReceived, 0) AS totalReceived,
            COALESCE(mel.pendingamount, 0) AS totalPendingAmount,
            COALESCE(p_summary.paymentsCount, 0) AS paymentsCount,
            CASE 
                WHEN COALESCE(mel.amount, 0) > 0 THEN ROUND((COALESCE(p_summary.totalReceived, 0) / mel.amount) * 100, 0)
                ELSE 0
            END AS collectionPercentage,
            dtm.id AS documentTypeId,
            dtm.typeName AS documentName,
            CASE 
                WHEN medm.id IS NOT NULL THEN 'Uploaded'
                ELSE 'Not Uploaded'
            END AS uploadStatus,
            mel.status AS leadStatus,um.fullName AS siteVisitorName,um1.fullName AS installerName,
            mel.createdAt
        FROM marketingexecutiveleads mel
        LEFT JOIN (
            SELECT 
                leadId,
                COALESCE(SUM(amount), 0) AS totalReceived,
                COUNT(id) AS paymentsCount
            FROM leadpaymentmappings
            GROUP BY leadId
        ) p_summary ON p_summary.leadId = mel.id
        CROSS JOIN documenttypemaster dtm 
        LEFT JOIN marketingexecutivedocumentmapping medm 
            ON medm.leadId = mel.id 
            AND medm.documentTypeId = dtm.id
         LEFT JOIN usermaster um ON um.id = mel.siteVisitorUserId
         LEFT JOIN usermaster um1 ON um1.id = mel.installerUserId
        WHERE mel.userId = ${userId}`;

export const leadsTimeLine = (leadId: number) => `SELECT 
    le.id AS eventId,
    le.leadId,
    le.eventName,
    -- Fetches the name of the person who took the action
    COALESCE(um.fullName, 'System') AS actionBy, 
    le.description,
    -- Formats the date to a readable standard (e.g., 18/4/2026, 10:30:00 pm)
    DATE_FORMAT(le.createdAt, '%d/%m/%Y, %h:%i:%s %p') AS activityTime
FROM leadevent le
LEFT JOIN usermaster um ON um.id = le.userId
WHERE le.leadId = ${leadId} 
  AND le.status = 1     
ORDER BY le.createdAt DESC;`;
