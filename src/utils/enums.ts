export enum StatusType {
  Active = 1,
  Inactive = 0,
  //Deleted = 'Deleted',
}

export enum ActionsSuperSet {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum Section {
  Hero_Section = 1,
  Impact = 2,
  SDG_Alignment = 146,
  Theory_Of_Change = 147,
  City_Rituals = 148,
  Join_Us_Form = 149,
  FAQ = 150,
  Our_Partners = 151,
}

export enum LeadStatus {
  QUERY_SENT = 'Query Sent',
  UNDER_REVIEW = 'Under Review',
  ADMIN_CONTACTED = 'Admin Contacted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ASSIGNED_TO_SITE_VISITOR = 'Assigned to Site Visitor',
  SITE_VISITOR_CONTACTED = 'Site Visitor Contacted',
  SITE_VISIT_SCHEDULED = 'Site Visit Scheduled',
  SITE_VISIT_COMPLETED = 'Site Visit Completed',
  ASSIGNED_TO_TECHNICIAN = 'Assigned to Technician',
  CONTACTED = 'Contacted',
  FOLLOW_UP_1_SCHEDULED = 'Follow-up 1 Scheduled',
  FOLLOW_UP_2_SCHEDULED = 'Follow-up 2 Scheduled',
  FOLLOW_UP_3_SCHEDULED = 'Follow-up 3 Scheduled',
  INSTALLATION_STARTED = 'Installation Started',
  INSTALLATION_COMPLETED = 'Installation Completed',
  PAYMENT_COMPLETED = 'Payment Completed',
  QUERY_CLOSED = 'Query Closed',
}

export enum DocumentType {
  DOCUMENT = 'Document',
  ROOF = 'Roof',
  INSTALLMENT = 'Installment',
}
