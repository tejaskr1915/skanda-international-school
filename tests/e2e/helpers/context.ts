export interface E2EContext {
  ts: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  academicYearId: string;
  applicantMobile: string;
  applicantEmail: string;
  applicantToken: string;
  applicationId: string;
  applicationNumber: string;
  studentId: string;
  studentEmail: string;
  studentPassword: string;
  parentEmail: string;
  parentPassword: string;
  feeInvoiceId: string;
  bookId: string;
  bookIssueId: string;
  tripId: string;
  gatePassId: string;
  gatePassQrToken: string;
  ptmEventId: string;
  leaveRequestId: string;
  lockoutUserId: string;
}

export function createInitialE2EContext(): E2EContext {
  const ts = Date.now().toString().slice(-6);
  return {
    ts,
    branchId: '',
    branchCode: `WFD-${ts}`,
    branchName: `Skanda International Campus - Whitefield ${ts}`,
    academicYearId: '',
    applicantMobile: `9400${ts}`,
    applicantEmail: `e2e_life_${ts}@skandatest.edu`,
    applicantToken: '',
    applicationId: '',
    applicationNumber: '',
    studentId: '',
    studentEmail: '',
    studentPassword: 'Password@123',
    parentEmail: '',
    parentPassword: 'Password@123',
    feeInvoiceId: '',
    bookId: '',
    bookIssueId: '',
    tripId: '',
    gatePassId: '',
    gatePassQrToken: '',
    ptmEventId: '',
    leaveRequestId: '',
    lockoutUserId: ''
  };
}
