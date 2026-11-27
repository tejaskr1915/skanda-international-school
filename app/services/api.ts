// API Client for Skanda International School admissions & auth
import { Platform } from 'react-native';
import { getApiBaseUrl, getServerBaseUrl, resolveFileUrl } from '../config/api';

class ApiService {
  private token: string | null = null;
  private portalToken: string | null = null;
  private activeBranchId: string | null = null;

  constructor() {
    this.loadToken();
  }

  public getBaseUrl(): string {
    return getApiBaseUrl();
  }

  public getServerUrl(): string {
    return getServerBaseUrl();
  }

  public resolveFileUrl(filePath?: string | null): string {
    return resolveFileUrl(filePath);
  }

  private loadToken() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('skanda_token');
      this.portalToken = window.localStorage.getItem('skanda_portal_token');
      this.activeBranchId = window.localStorage.getItem('skanda_active_branch_id');
    }
  }

  public setPortalToken(token: string | null) {
    this.portalToken = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (token) window.localStorage.setItem('skanda_portal_token', token);
      else window.localStorage.removeItem('skanda_portal_token');
    }
  }

  public getPortalToken() {
    if (!this.portalToken && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.portalToken = window.localStorage.getItem('skanda_portal_token');
    }
    return this.portalToken;
  }

  public setActiveBranchId(branchId: string | null) {
    this.activeBranchId = branchId;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (branchId) window.localStorage.setItem('skanda_active_branch_id', branchId);
      else window.localStorage.removeItem('skanda_active_branch_id');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('skanda_token', token);
      } else {
        window.localStorage.removeItem('skanda_token');
      }
    }
  }

  public getToken() {
    if (!this.token && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('skanda_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} error:`, error.message);
      throw error;
    }
  }

  // --- Auth APIs ---
  async registerStep1(payload: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
  }) {
    const data = await this.request('/auth/register-step1', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async sendOtp(mobile: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile })
    });
  }

  async verifyOtp(mobile: string, otp: string) {
    const data = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async loginPassword(mobile: string, password: string) {
    const data = await this.request('/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ mobile, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  // --- Applications APIs ---
  async getMe() {
    return this.request('/applications/me');
  }

  async statusLookup(applicationNo: string, mobile?: string) {
    return this.request('/applications/status-lookup', {
      method: 'POST',
      body: JSON.stringify({ applicationNo, mobile })
    });
  }

  async saveStep(stepNumber: number, payload: any) {
    return this.request(`/applications/step/${stepNumber}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async submitApplication() {
    return this.request('/applications/submit', {
      method: 'POST'
    });
  }

  // --- Academic Metadata ---
  async getAcademicMetadata() {
    return this.request('/academic/academic-metadata');
  }

  async getAcademicSubjects(classOrCourse: string, board?: string, department?: string, institutionType?: string) {
    const params: Record<string, string> = {};
    if (classOrCourse) params.classOrCourse = classOrCourse;
    if (board) params.board = board;
    if (department) params.department = department;
    if (institutionType) params.institutionType = institutionType;
    const query = new URLSearchParams(params).toString();
    return this.request(`/academic/academic-subjects?${query}`);
  }

  // ============================================================================
  // PHASE 2: MULTI-BRANCH, RBAC & ROLE PORTAL APIs
  // ============================================================================
  private async portalRequest(endpoint: string, options: RequestInit = {}) {
    const token = this.getPortalToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.activeBranchId) headers['x-branch-id'] = this.activeBranchId;

    const res = await fetch(`${this.getBaseUrl()}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Portal request failed');
    return data;
  }

  async portalLogin(email: string, password: string) {
    return this.portalRequest('/portal-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getPortalMe() {
    return this.portalRequest('/portal-auth/me');
  }

  // Super Admin
  async getBranches() {
    return this.portalRequest('/super-admin/branches');
  }
  async createBranch(payload: any) {
    return this.portalRequest('/super-admin/branches', { method: 'POST', body: JSON.stringify(payload) });
  }
  async updateBranch(id: string, payload: any) {
    return this.portalRequest(`/super-admin/branches/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async getBranchConfig(branchId: string) {
    return this.portalRequest(`/super-admin/branches/${branchId}/config`);
  }
  async addBranchSyllabus(branchId: string, payload: any) {
    return this.portalRequest(`/super-admin/branches/${branchId}/syllabi`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async addBranchGrade(branchId: string, payload: any) {
    return this.portalRequest(`/super-admin/branches/${branchId}/grades`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async addBranchSubject(branchId: string, payload: any) {
    return this.portalRequest(`/super-admin/branches/${branchId}/subjects`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async addBranchFeeStructure(branchId: string, payload: any) {
    return this.portalRequest(`/super-admin/branches/${branchId}/fee-structures`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async getStaffUsers(branchId?: string) {
    const q = branchId ? `?branchId=${branchId}` : '';
    return this.portalRequest(`/super-admin/users${q}`);
  }
  async provisionStaffUser(payload: any) {
    return this.portalRequest('/super-admin/users', { method: 'POST', body: JSON.stringify(payload) });
  }
  async updateStaffPermissions(userId: string, payload: any) {
    return this.portalRequest(`/super-admin/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  // Branch Admin / Principal
  async getBranchKpis() {
    return this.portalRequest('/branch-admin/kpis');
  }
  async getBranchApplications() {
    return this.portalRequest('/branch-admin/applications');
  }
  async updateBranchApplicationStatus(id: string, status: string) {
    return this.portalRequest(`/branch-admin/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
  async convertApplicationToStudent(id: string, section = 'A') {
    return this.portalRequest(`/branch-admin/applications/${id}/convert`, { method: 'POST', body: JSON.stringify({ section }) });
  }
  async getBranchAttendance() {
    return this.portalRequest('/branch-admin/attendance');
  }
  async overrideAttendance(id: string, status: string) {
    return this.portalRequest(`/branch-admin/attendance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  }
  async getBranchLeaves() {
    return this.portalRequest('/branch-admin/leaves');
  }
  async getLeaveSubstituteRecommendations(leaveId: string) {
    return this.portalRequest(`/branch-admin/leaves/${leaveId}/substitute-recommendations`);
  }
  async approveLeaveRequest(leaveId: string, payload: any) {
    return this.portalRequest(`/branch-admin/leaves/${leaveId}/approve`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async getBranchExams() {
    return this.portalRequest('/branch-admin/exams');
  }
  async publishExamResults(examId: string) {
    return this.portalRequest(`/branch-admin/exams/${examId}/publish`, { method: 'POST' });
  }
  async issueExamHallTickets(examId: string) {
    return this.portalRequest(`/branch-admin/exams/${examId}/hall-tickets`, { method: 'POST' });
  }
  async getBranchFees() {
    return this.portalRequest('/branch-admin/fees');
  }
  async applyScholarship(invoiceId: string, scholarshipDiscount: number) {
    return this.portalRequest(`/branch-admin/fees/${invoiceId}/scholarship`, { method: 'POST', body: JSON.stringify({ scholarshipDiscount }) });
  }
  async recordBranchFeePayment(invoiceId: string, amount: number) {
    return this.portalRequest(`/branch-admin/fees/${invoiceId}/pay`, { method: 'POST', body: JSON.stringify({ amount }) });
  }
  async getBranchCms() {
    return this.portalRequest('/branch-admin/cms');
  }
  async createBranchCms(payload: any) {
    return this.portalRequest('/branch-admin/cms', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Student / Parent / Teacher Portals
  async getStudentPortalView(studentId?: string) {
    const q = studentId ? `?studentId=${studentId}` : '';
    return this.portalRequest(`/portal/student-view${q}`);
  }
  async submitAssignment(assignmentId: string, content: string) {
    return this.portalRequest(`/portal/assignments/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify({ content }) });
  }
  async payPortalFee(invoiceId: string, amount: number) {
    return this.portalRequest(`/portal/fees/${invoiceId}/pay`, { method: 'POST', body: JSON.stringify({ amount }) });
  }
  async submitLeaveRequest(payload: any) {
    return this.portalRequest('/portal/leaves', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getTeacherPortalView() {
    return this.portalRequest('/portal/teacher-view');
  }
  async syncTeacherAttendance(entries: any[]) {
    return this.portalRequest('/portal/teacher/attendance/sync', { method: 'POST', body: JSON.stringify({ entries }) });
  }
  async createTeacherAssignment(payload: any) {
    return this.portalRequest('/portal/teacher/assignments', { method: 'POST', body: JSON.stringify(payload) });
  }
  async gradeSubmission(submissionId: string, marks: number, feedback: string) {
    return this.portalRequest(`/portal/teacher/submissions/${submissionId}/grade`, { method: 'POST', body: JSON.stringify({ marks, feedback }) });
  }
  async enterExamMarks(payload: any) {
    return this.portalRequest('/portal/teacher/marks', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Library Management & Automated Fine Sync
  async getLibraryBooks(search?: string, category?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category && category !== 'ALL') params.set('category', category);
    const qs = params.toString();
    return this.portalRequest(`/library/books${qs ? `?${qs}` : ''}`);
  }
  async createLibraryBook(payload: any) {
    return this.portalRequest('/library/books', { method: 'POST', body: JSON.stringify(payload) });
  }
  async updateLibraryBook(id: string, payload: any) {
    return this.portalRequest(`/library/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async deleteLibraryBook(id: string) {
    return this.portalRequest(`/library/books/${id}`, { method: 'DELETE' });
  }
  async getLibraryIssues() {
    return this.portalRequest('/library/issues');
  }
  async issueLibraryBook(payload: any) {
    return this.portalRequest('/library/issue', { method: 'POST', body: JSON.stringify(payload) });
  }
  async returnLibraryBook(issueId: string) {
    return this.portalRequest(`/library/return/${issueId}`, { method: 'POST', body: JSON.stringify({}) });
  }
  async syncOverdueLibraryFines() {
    return this.portalRequest('/library/sync-overdue', { method: 'POST', body: JSON.stringify({}) });
  }
  async getLibraryReservations() {
    return this.portalRequest('/library/reservations');
  }
  async reserveLibraryBook(bookId: string) {
    return this.portalRequest('/library/reservations', { method: 'POST', body: JSON.stringify({ bookId }) });
  }
  async getMyLibrary(studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return this.portalRequest(`/library/my-library${qs}`);
  }

  // Transport Management & Live Smartphone Bus ETA
  async getTransportVehicles() {
    return this.portalRequest('/transport/vehicles');
  }
  async createTransportVehicle(payload: any) {
    return this.portalRequest('/transport/vehicles', { method: 'POST', body: JSON.stringify(payload) });
  }
  async deleteTransportVehicle(id: string) {
    return this.portalRequest(`/transport/vehicles/${id}`, { method: 'DELETE' });
  }
  async getTransportComplianceAlerts() {
    return this.portalRequest('/transport/compliance-alerts');
  }
  async getTransportRoutes() {
    return this.portalRequest('/transport/routes');
  }
  async createTransportRoute(payload: any) {
    return this.portalRequest('/transport/routes', { method: 'POST', body: JSON.stringify(payload) });
  }
  async deleteTransportRoute(id: string) {
    return this.portalRequest(`/transport/routes/${id}`, { method: 'DELETE' });
  }
  async addRouteStop(routeId: string, payload: any) {
    return this.portalRequest(`/transport/routes/${routeId}/stops`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async deleteRouteStop(stopId: string) {
    return this.portalRequest(`/transport/stops/${stopId}`, { method: 'DELETE' });
  }
  async getTransportAllocations() {
    return this.portalRequest('/transport/allocations');
  }
  async createTransportAllocation(payload: any) {
    return this.portalRequest('/transport/allocations', { method: 'POST', body: JSON.stringify(payload) });
  }
  async deleteTransportAllocation(id: string) {
    return this.portalRequest(`/transport/allocations/${id}`, { method: 'DELETE' });
  }
  async getTransportTrips() {
    return this.portalRequest('/transport/trips');
  }
  async startBusTrip(payload: { routeId: string; lat?: number; lng?: number }) {
    return this.portalRequest('/transport/trips/start', { method: 'POST', body: JSON.stringify(payload) });
  }
  async sendBusTelemetry(tripId: string, payload: { lat: number; lng: number; speed?: number }) {
    return this.portalRequest(`/transport/trips/${tripId}/telemetry`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async arriveBusStop(tripId: string, stopOrder?: number) {
    return this.portalRequest(`/transport/trips/${tripId}/arrive-stop`, { method: 'POST', body: JSON.stringify({ stopOrder }) });
  }
  async broadcastBusDelay(tripId: string, payload: { delayMinutes: number; delayMessage: string }) {
    return this.portalRequest(`/transport/trips/${tripId}/delay`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async endBusTrip(tripId: string) {
    return this.portalRequest(`/transport/trips/${tripId}/end`, { method: 'POST', body: JSON.stringify({}) });
  }
  async getMyBus(studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return this.portalRequest(`/transport/my-bus${qs}`);
  }

  // Hostel, QR Out-Passes, Gate Kiosk & No-Dues Clearance
  async getHostelOccupancy() {
    return this.portalRequest('/hostel/occupancy');
  }
  async createHostelBlock(payload: { blockName: string; genderType: string }) {
    return this.portalRequest('/hostel/blocks', { method: 'POST', body: JSON.stringify(payload) });
  }
  async createHostelRoom(payload: { blockId: string; roomNumber: string; floor: number; capacity: number }) {
    return this.portalRequest('/hostel/rooms', { method: 'POST', body: JSON.stringify(payload) });
  }
  async allocateHostelBed(payload: { roomId: string; bedNumber: number; emailOrAdmission: string }) {
    return this.portalRequest('/hostel/allocate-bed', { method: 'POST', body: JSON.stringify(payload) });
  }
  async vacateHostelBed(allocationId: string, maintenanceDue?: number) {
    return this.portalRequest(`/hostel/vacate-bed/${allocationId}`, {
      method: 'POST',
      body: JSON.stringify({ maintenanceDue: maintenanceDue || 0 })
    });
  }
  async getMessMenu() {
    return this.portalRequest('/hostel/mess-menu');
  }
  async upsertMessMenu(payload: { dayOfWeek: string; breakfast: string; lunch: string; snacks: string; dinner: string }) {
    return this.portalRequest('/hostel/mess-menu', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getHostelTickets() {
    return this.portalRequest('/hostel/tickets');
  }
  async createHostelTicket(payload: { roomId: string; title: string; description: string }) {
    return this.portalRequest('/hostel/tickets', { method: 'POST', body: JSON.stringify(payload) });
  }
  async updateHostelTicket(id: string, payload: { status: string; repairCost?: number }) {
    return this.portalRequest(`/hostel/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async getHostelGatePasses() {
    return this.portalRequest('/hostel/gate-passes');
  }
  async getMyGatePasses(studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return this.portalRequest(`/hostel/my-gate-passes${qs}`);
  }
  async requestGatePass(payload: { passType: string; reason: string; destination?: string; studentId?: string }) {
    return this.portalRequest('/hostel/gate-passes', { method: 'POST', body: JSON.stringify(payload) });
  }
  async parentApproveGatePass(id: string) {
    return this.portalRequest(`/hostel/gate-passes/${id}/parent-approve`, { method: 'POST', body: JSON.stringify({}) });
  }
  async wardenApproveGatePass(id: string) {
    return this.portalRequest(`/hostel/gate-passes/${id}/warden-approve`, { method: 'POST', body: JSON.stringify({}) });
  }
  async rejectGatePass(id: string) {
    return this.portalRequest(`/hostel/gate-passes/${id}/reject`, { method: 'POST', body: JSON.stringify({}) });
  }
  async getNoDues(studentId: string) {
    return this.portalRequest(`/no-dues/${studentId}`);
  }
  async toggleLabClearance(studentId: string, cleared: boolean) {
    return this.portalRequest(`/no-dues/${studentId}/labs`, { method: 'POST', body: JSON.stringify({ cleared }) });
  }
  async generateTransferCertificate(studentId: string) {
    return this.portalRequest(`/no-dues/${studentId}/generate-tc`, { method: 'POST', body: JSON.stringify({}) });
  }

  // Smart Gate Kiosk (Public / Tablet Interface)
  async getKioskBranches() {
    return this.request('/kiosk/branches');
  }
  async getKioskVisitors(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return this.request(`/kiosk/visitors${qs}`);
  }
  async requestVisitorOtp(payload: { branchId?: string; visitorName: string; visitorPhone: string; purpose: string; hostStudentAdmissionNo?: string }) {
    return this.request('/kiosk/visitors/request-otp', { method: 'POST', body: JSON.stringify(payload) });
  }
  async verifyVisitorOtp(payload: { visitorLogId: string; otpCode: string }) {
    return this.request('/kiosk/visitors/verify-otp', { method: 'POST', body: JSON.stringify(payload) });
  }
  async checkoutVisitor(id: string) {
    return this.request(`/kiosk/visitors/${id}/checkout`, { method: 'POST', body: JSON.stringify({}) });
  }
  async scanGatePassQr(qrPayload: string) {
    return this.request('/kiosk/scan-qr', { method: 'POST', body: JSON.stringify({ qrPayload }) });
  }

  // PTM Slot Booker, DLT Campaigns & WhatsApp Parent Bot Simulator
  async getPtmEvents() {
    return this.portalRequest('/comms/ptm/events');
  }
  async createPtmEvent(payload: { title: string; eventDate: string; startTime: string; endTime: string; slotMinutes?: number; meetingMode?: string }) {
    return this.portalRequest('/comms/ptm/events', { method: 'POST', body: JSON.stringify(payload) });
  }
  async bookPtmSlot(slotId: string, payload: { studentId?: string; notes?: string }) {
    return this.portalRequest(`/comms/ptm/slots/${slotId}/book`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async cancelPtmSlot(slotId: string) {
    return this.portalRequest(`/comms/ptm/slots/${slotId}/cancel`, { method: 'POST', body: JSON.stringify({}) });
  }
  async getDltTemplates() {
    return this.portalRequest('/comms/dlt-templates');
  }
  async createDltTemplate(payload: { templateId: string; senderId: string; channel: string; eventTrigger: string; bodyWithPlaceholders: string }) {
    return this.portalRequest('/comms/dlt-templates', { method: 'POST', body: JSON.stringify(payload) });
  }
  async sendDltCampaign(payload: { templateId: string; targetAudience: string; variables: Record<string, string> }) {
    return this.portalRequest('/comms/campaigns/send', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getCampaignLogs() {
    return this.portalRequest('/comms/logs');
  }
  async sendWhatsAppBotMessage(phone: string, message: string) {
    return this.request('/webhooks/whatsapp', { method: 'POST', body: JSON.stringify({ phone, message }) });
  }

  // Sprint 7: Labs, Activities, Rollover, Extended Academics, Accounts/Docs & Placement
  async getLabs() {
    return this.portalRequest('/labs');
  }
  async createLab(payload: { name: string; labType: string; roomNo: string; capacity?: number }) {
    return this.portalRequest('/labs', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getLabJournals() {
    return this.portalRequest('/labs/journals');
  }
  async submitLabJournal(payload: { experimentId: string; submissionNotes: string }) {
    return this.portalRequest('/labs/journals', { method: 'POST', body: JSON.stringify(payload) });
  }
  async gradeLabJournal(id: string, payload: { observationMarks: number; recordMarks: number; vivaMarks: number }) {
    return this.portalRequest(`/labs/journals/${id}/grade`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async getActivities() {
    return this.portalRequest('/activities');
  }
  async createActivity(payload: any) {
    return this.portalRequest('/activities', { method: 'POST', body: JSON.stringify(payload) });
  }
  async enrollActivity(activityId: string, studentId?: string) {
    return this.portalRequest(`/activities/${activityId}/enroll`, { method: 'POST', body: JSON.stringify({ studentId }) });
  }
  async consentActivityEnrollment(enrollmentId: string, otpCode?: string) {
    return this.portalRequest(`/activities/enrollments/${enrollmentId}/consent`, { method: 'POST', body: JSON.stringify({ otpCode }) });
  }
  async getRolloverYears() {
    return this.portalRequest('/rollover/years');
  }
  async previewRollover(fromYearId: string) {
    return this.portalRequest('/rollover/preview', { method: 'POST', body: JSON.stringify({ fromYearId }) });
  }
  async executeRollover(payload: { fromYearId: string; toYearName: string; exceptions?: Record<string, string> }) {
    return this.portalRequest('/rollover/execute', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getSyllabus() {
    return this.portalRequest('/academics-ext/syllabus');
  }
  async toggleSyllabusChapter(id: string) {
    return this.portalRequest(`/academics-ext/syllabus/${id}/toggle`, { method: 'POST', body: JSON.stringify({}) });
  }
  async getCollegeRecords(studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return this.portalRequest(`/academics-ext/college-records${qs}`);
  }
  async getCheques() {
    return this.portalRequest('/finance-docs/cheques');
  }
  async getReconciliations() {
    return this.portalRequest('/finance-docs/reconciliations');
  }
  async getDocumentRequests() {
    return this.portalRequest('/finance-docs/documents');
  }
  async requestDocument(payload: { docType: string; reason: string; studentId?: string }) {
    return this.portalRequest('/finance-docs/documents', { method: 'POST', body: JSON.stringify(payload) });
  }
  async decideDocumentRequest(id: string, status: string) {
    return this.portalRequest(`/finance-docs/documents/${id}/decision`, { method: 'POST', body: JSON.stringify({ status }) });
  }
  async getAlumni() {
    return this.portalRequest('/placement/alumni');
  }
  async verifyAlumni(id: string) {
    return this.portalRequest(`/placement/alumni/${id}/verify`, { method: 'POST', body: JSON.stringify({}) });
  }
  async getPlacementDrives() {
    return this.portalRequest('/placement/drives');
  }
  async createPlacementDrive(payload: any) {
    return this.portalRequest('/placement/drives', { method: 'POST', body: JSON.stringify(payload) });
  }
  async applyPlacementDrive(driveId: string, studentId?: string) {
    return this.portalRequest(`/placement/drives/${driveId}/apply`, { method: 'POST', body: JSON.stringify({ studentId }) });
  }
}

export const api = new ApiService();
export default api;
