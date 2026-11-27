const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 3 Transport & Live ETA Tests', () => {
  let managerToken = '';
  let driverToken = '';
  let student2Token = '';
  let createdVehicleId = '';
  let createdRouteId = '';
  let createdTripId = '';
  let stop1Id = '';
  let stop2Id = '';

  afterAll(async () => {
    if (createdTripId) {
      await prisma.activeBusTrip.delete({ where: { id: createdTripId } }).catch(() => {});
    }
    if (createdRouteId) {
      await prisma.transportRoute.delete({ where: { id: createdRouteId } }).catch(() => {});
    }
    if (createdVehicleId) {
      await prisma.transportVehicle.delete({ where: { id: createdVehicleId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('1. Transport Manager creates vehicle and receives 30-day compliance alert', async () => {
    const loginRes = await request(app).post('/api/portal-auth/login').send({
      email: 'transport.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('TRANSPORT_MANAGER');
    managerToken = loginRes.body.token;

    const in10Days = new Date(Date.now() + 10 * 86400000).toISOString();
    const in180Days = new Date(Date.now() + 180 * 86400000).toISOString();

    const vRes = await request(app)
      .post('/api/transport/vehicles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        busNumber: `BUS-TST-${Date.now().toString().slice(-4)}`,
        registrationNo: `KA-05-TT-${Date.now().toString().slice(-4)}`,
        capacity: 1,
        insuranceExpiry: in10Days,
        fitnessExpiry: in180Days,
        driverName: 'Test Driver',
        driverPhone: '9880012345',
        driverLicenseExpiry: in180Days
      });
    expect(vRes.status).toBe(201);
    createdVehicleId = vRes.body.vehicle.id;
    expect(vRes.body.vehicle.complianceAlerts.length).toBeGreaterThanOrEqual(1);

    const alertRes = await request(app)
      .get('/api/transport/compliance-alerts')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(alertRes.status).toBe(200);
    expect(alertRes.body.alerts.some((a) => a.vehicleId === createdVehicleId)).toBe(true);
  });

  test('2. Route builder and strict seat capacity enforcement', async () => {
    const rRes = await request(app)
      .post('/api/transport/routes')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        vehicleId: createdVehicleId,
        routeCode: `RT-TST-${Date.now().toString().slice(-4)}`,
        routeName: 'Test Express Route',
        stops: [
          { sequenceOrder: 1, stopName: 'Stop Alpha', lat: 12.92, lng: 77.59, scheduledTime: '07:30' },
          { sequenceOrder: 2, stopName: 'Stop Beta', lat: 12.88, lng: 77.55, scheduledTime: '07:50' }
        ]
      });
    expect(rRes.status).toBe(201);
    createdRouteId = rRes.body.route.id;
    stop1Id = rRes.body.route.stops[0].id;
    stop2Id = rRes.body.route.stops[1].id;

    // Allocate student2 -> succeeds (1/1 seats)
    const alloc1 = await request(app)
      .post('/api/transport/allocations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        emailOrAdmission: 'student2.blr@skanda.edu.in',
        routeId: createdRouteId,
        stopId: stop1Id
      });
    expect(alloc1.status).toBe(201);

    // Attempt to allocate student1 onto full 1-seat bus -> fails (400)
    const alloc2 = await request(app)
      .post('/api/transport/allocations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        emailOrAdmission: 'student1.blr@skanda.edu.in',
        routeId: createdRouteId,
        stopId: stop2Id
      });
    expect(alloc2.status).toBe(400);
    expect(alloc2.body.message).toMatch(/full seat capacity/i);
  });

  test('3. Driver starts trip, streams smartphone GPS telemetry, broadcasts delay, and student tracks live ETA', async () => {
    const dLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'driver.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(dLogin.status).toBe(200);
    expect(dLogin.body.user.role).toBe('DRIVER');
    driverToken = dLogin.body.token;

    const startRes = await request(app)
      .post('/api/transport/trips/start')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ routeId: createdRouteId, lat: 12.925, lng: 77.595 });
    expect(startRes.status).toBe(201);
    createdTripId = startRes.body.trip.id;

    const telRes = await request(app)
      .post(`/api/transport/trips/${createdTripId}/telemetry`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 12.90, lng: 77.57, speed: 35 });
    expect(telRes.status).toBe(200);
    expect(telRes.body.trip.stopEtas.length).toBe(2);
    expect(telRes.body.trip.stopEtas[1].etaMinutes).toBeGreaterThanOrEqual(1);

    const delayRes = await request(app)
      .post(`/api/transport/trips/${createdTripId}/delay`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ delayMinutes: 12, delayMessage: 'Signal congestion at Silk Board' });
    expect(delayRes.status).toBe(200);
    expect(delayRes.body.trip.status).toBe('DELAYED');

    // Student2 checks live bus tracker
    const sLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'student2.blr@skanda.edu.in',
      password: 'Password@123'
    });
    student2Token = sLogin.body.token;

    const myBusRes = await request(app)
      .get('/api/transport/my-bus')
      .set('Authorization', `Bearer ${student2Token}`);
    expect(myBusRes.status).toBe(200);
    expect(myBusRes.body.activeTrip.id).toBe(createdTripId);
    expect(myBusRes.body.activeTrip.status).toBe('DELAYED');
    expect(myBusRes.body.stopEtas.length).toBe(2);

    // Driver arrives stop 1 and ends trip
    const arrRes = await request(app)
      .post(`/api/transport/trips/${createdTripId}/arrive-stop`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ stopOrder: 1 });
    expect(arrRes.status).toBe(200);
    expect(arrRes.body.trip.currentStopOrder).toBe(2);

    const endRes = await request(app)
      .post(`/api/transport/trips/${createdTripId}/end`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(endRes.status).toBe(200);
    expect(endRes.body.trip.status).toBe('COMPLETED');
  });
});
