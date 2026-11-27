const express = require('express');
const router = express.Router();
const prisma = require('../db');
const {
  portalAuthMiddleware,
  requireRole,
  resolveBranchId
} = require('../middleware/rbac');

router.use(portalAuthMiddleware);

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TRANSPORT_MANAGER'];
const DRIVER_AND_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'];

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeStopEtas(stops, trip) {
  if (!stops || stops.length === 0) return [];
  const sorted = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  if (!trip) {
    return sorted.map((s) => ({
      ...s,
      passed: false,
      isCurrent: false,
      distanceKm: null,
      etaMinutes: null
    }));
  }

  const effectiveSpeedKmh = trip.speed && trip.speed >= 5 ? trip.speed : 28;
  return sorted.map((s) => {
    const passed = trip.status === 'COMPLETED' || s.sequenceOrder < trip.currentStopOrder;
    const isCurrent = trip.status !== 'COMPLETED' && s.sequenceOrder === trip.currentStopOrder;
    const distanceKm = Number(haversineKm(trip.liveLat, trip.liveLng, s.lat, s.lng).toFixed(2));
    const etaMinutes = passed
      ? 0
      : Math.max(1, Math.round((distanceKm / effectiveSpeedKmh) * 60) + (trip.delayMinutes || 0));
    return {
      ...s,
      passed,
      isCurrent,
      distanceKm,
      etaMinutes
    };
  });
}

function getComplianceAlertsForVehicle(v) {
  const now = Date.now();
  const thresholdMs = 30 * 86400000;
  const checks = [
    { field: 'insuranceExpiry', label: 'Vehicle Insurance', date: v.insuranceExpiry },
    { field: 'fitnessExpiry', label: 'Fitness Certificate', date: v.fitnessExpiry },
    { field: 'driverLicenseExpiry', label: `Driver License (${v.driverName})`, date: v.driverLicenseExpiry }
  ];

  const alerts = [];
  for (const c of checks) {
    const expMs = new Date(c.date).getTime();
    const diffMs = expMs - now;
    if (diffMs <= thresholdMs) {
      const daysRemaining = Math.ceil(diffMs / 86400000);
      alerts.push({
        field: c.field,
        label: c.label,
        expiryDate: c.date,
        daysRemaining,
        isExpired: daysRemaining < 0
      });
    }
  }
  return alerts;
}

// ----------------------------------------------------------------------------
// VEHICLES & 30-DAY COMPLIANCE ALERTS
// ----------------------------------------------------------------------------

router.get('/vehicles', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const vehicles = await prisma.transportVehicle.findMany({
      where: { branchId },
      orderBy: { busNumber: 'asc' }
    });
    const enriched = vehicles.map((v) => ({
      ...v,
      complianceAlerts: getComplianceAlertsForVehicle(v)
    }));
    res.json({ success: true, vehicles: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/vehicles', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const {
      busNumber,
      registrationNo,
      capacity,
      insuranceExpiry,
      fitnessExpiry,
      driverName,
      driverPhone,
      driverLicenseExpiry
    } = req.body;

    if (!busNumber || !registrationNo || !driverName || !driverPhone || !insuranceExpiry || !fitnessExpiry || !driverLicenseExpiry) {
      return res.status(400).json({ success: false, message: 'All vehicle, driver, and expiry fields are required.' });
    }

    const vehicle = await prisma.transportVehicle.create({
      data: {
        branchId,
        busNumber: busNumber.trim().toUpperCase(),
        registrationNo: registrationNo.trim().toUpperCase(),
        capacity: Number(capacity) || 40,
        insuranceExpiry: new Date(insuranceExpiry),
        fitnessExpiry: new Date(fitnessExpiry),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        driverLicenseExpiry: new Date(driverLicenseExpiry)
      }
    });

    res.status(201).json({
      success: true,
      vehicle: { ...vehicle, complianceAlerts: getComplianceAlertsForVehicle(vehicle) }
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Bus number already exists in this branch.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/vehicles/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.transportVehicle.findFirst({ where: { id: req.params.id, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    const data = {};
    if (req.body.registrationNo !== undefined) data.registrationNo = req.body.registrationNo.trim().toUpperCase();
    if (req.body.capacity !== undefined) data.capacity = Number(req.body.capacity);
    if (req.body.insuranceExpiry !== undefined) data.insuranceExpiry = new Date(req.body.insuranceExpiry);
    if (req.body.fitnessExpiry !== undefined) data.fitnessExpiry = new Date(req.body.fitnessExpiry);
    if (req.body.driverName !== undefined) data.driverName = req.body.driverName.trim();
    if (req.body.driverPhone !== undefined) data.driverPhone = req.body.driverPhone.trim();
    if (req.body.driverLicenseExpiry !== undefined) data.driverLicenseExpiry = new Date(req.body.driverLicenseExpiry);

    const vehicle = await prisma.transportVehicle.update({ where: { id: existing.id }, data });
    res.json({
      success: true,
      vehicle: { ...vehicle, complianceAlerts: getComplianceAlertsForVehicle(vehicle) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/vehicles/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.transportVehicle.findFirst({ where: { id: req.params.id, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    await prisma.transportVehicle.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/compliance-alerts', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const vehicles = await prisma.transportVehicle.findMany({ where: { branchId } });
    const alerts = [];
    for (const v of vehicles) {
      const vAlerts = getComplianceAlertsForVehicle(v);
      for (const a of vAlerts) {
        alerts.push({
          vehicleId: v.id,
          busNumber: v.busNumber,
          registrationNo: v.registrationNo,
          driverName: v.driverName,
          ...a
        });
      }
    }
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// ROUTES & STOP-WISE BUILDER
// ----------------------------------------------------------------------------

router.get('/routes', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const routes = await prisma.transportRoute.findMany({
      where: { branchId },
      include: {
        vehicle: true,
        stops: { orderBy: { sequenceOrder: 'asc' } },
        _count: { select: { allocations: true } },
        trips: {
          where: { status: { in: ['IN_PROGRESS', 'DELAYED'] } },
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { routeCode: 'asc' }
    });
    res.json({ success: true, routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/routes', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { vehicleId, routeCode, routeName, stops } = req.body;
    if (!vehicleId || !routeCode || !routeName) {
      return res.status(400).json({ success: false, message: 'vehicleId, routeCode, and routeName are required.' });
    }

    const vehicle = await prisma.transportVehicle.findFirst({ where: { id: vehicleId, branchId } });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found in branch.' });

    const route = await prisma.transportRoute.create({
      data: {
        branchId,
        vehicleId,
        routeCode: routeCode.trim().toUpperCase(),
        routeName: routeName.trim(),
        stops: Array.isArray(stops) && stops.length > 0
          ? {
              create: stops.map((s, idx) => ({
                sequenceOrder: Number(s.sequenceOrder) || idx + 1,
                stopName: String(s.stopName).trim(),
                lat: Number(s.lat),
                lng: Number(s.lng),
                scheduledTime: String(s.scheduledTime || '08:00').trim()
              }))
            }
          : undefined
      },
      include: {
        vehicle: true,
        stops: { orderBy: { sequenceOrder: 'asc' } }
      }
    });

    res.status(201).json({ success: true, route });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Route code already exists in this branch.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/routes/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const route = await prisma.transportRoute.findFirst({ where: { id: req.params.id, branchId } });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    await prisma.transportRoute.delete({ where: { id: route.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/routes/:routeId/stops', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const route = await prisma.transportRoute.findFirst({
      where: { id: req.params.routeId, branchId },
      include: { stops: true }
    });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });

    const { stopName, lat, lng, scheduledTime, sequenceOrder } = req.body;
    if (!stopName || lat === undefined || lng === undefined || !scheduledTime) {
      return res.status(400).json({ success: false, message: 'stopName, lat, lng, and scheduledTime are required.' });
    }

    const nextOrder = sequenceOrder ? Number(sequenceOrder) : route.stops.length + 1;
    const stop = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        sequenceOrder: nextOrder,
        stopName: stopName.trim(),
        lat: Number(lat),
        lng: Number(lng),
        scheduledTime: scheduledTime.trim()
      }
    });

    res.status(201).json({ success: true, stop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/stops/:stopId', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const stop = await prisma.routeStop.findUnique({
      where: { id: req.params.stopId },
      include: { route: true }
    });
    if (!stop || stop.route.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Stop not found.' });
    }
    await prisma.routeStop.delete({ where: { id: stop.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// STUDENT SEAT ALLOCATIONS (STRICT CAPACITY ENFORCEMENT)
// ----------------------------------------------------------------------------

router.get('/allocations', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const [allocations, students] = await Promise.all([
      prisma.studentTransportAllocation.findMany({
        where: { branchId },
        include: {
          student: { include: { user: { select: { fullName: true, email: true } } } },
          route: { include: { vehicle: true } },
          stop: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.studentProfile.findMany({
        where: { branchId },
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { admissionNo: 'asc' }
      })
    ]);
    res.json({ success: true, allocations, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/allocations', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { studentId, emailOrAdmission, routeId, stopId } = req.body;

    if ((!studentId && !emailOrAdmission) || !routeId || !stopId) {
      return res.status(400).json({ success: false, message: 'Student, routeId, and stopId are required.' });
    }

    let student = null;
    if (studentId) {
      student = await prisma.studentProfile.findFirst({ where: { id: studentId, branchId } });
    } else {
      const term = String(emailOrAdmission).trim();
      student = await prisma.studentProfile.findFirst({
        where: {
          branchId,
          OR: [{ admissionNo: term }, { user: { email: term } }]
        }
      });
    }
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in this branch.' });

    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, branchId },
      include: { vehicle: true, _count: { select: { allocations: true } } }
    });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });

    const stop = await prisma.routeStop.findFirst({ where: { id: stopId, routeId: route.id } });
    if (!stop) return res.status(404).json({ success: false, message: 'Stop does not belong to selected route.' });

    // Check existing allocation for this student
    const existingAlloc = await prisma.studentTransportAllocation.findUnique({
      where: { studentId: student.id }
    });

    // Strict seat capacity enforcement (allow updating own route if already on this route)
    const isMovingToNewRoute = !existingAlloc || existingAlloc.routeId !== route.id;
    if (isMovingToNewRoute && route._count.allocations >= route.vehicle.capacity) {
      return res.status(400).json({
        success: false,
        message: `Vehicle ${route.vehicle.busNumber} is at full seat capacity (${route.vehicle.capacity}/${route.vehicle.capacity}).`
      });
    }

    const allocation = existingAlloc
      ? await prisma.studentTransportAllocation.update({
          where: { id: existingAlloc.id },
          data: { routeId: route.id, stopId: stop.id },
          include: {
            student: { include: { user: { select: { fullName: true, email: true } } } },
            route: { include: { vehicle: true } },
            stop: true
          }
        })
      : await prisma.studentTransportAllocation.create({
          data: { branchId, studentId: student.id, routeId: route.id, stopId: stop.id },
          include: {
            student: { include: { user: { select: { fullName: true, email: true } } } },
            route: { include: { vehicle: true } },
            stop: true
          }
        });

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { transportOpted: true }
    });

    res.status(201).json({ success: true, allocation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/allocations/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const alloc = await prisma.studentTransportAllocation.findFirst({ where: { id: req.params.id, branchId } });
    if (!alloc) return res.status(404).json({ success: false, message: 'Allocation not found.' });
    await prisma.studentTransportAllocation.delete({ where: { id: alloc.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// DRIVER SMARTPHONE TELEMETRY, TRIP LIFECYCLE & DELAY BROADCASTS
// ----------------------------------------------------------------------------

router.get('/trips', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const trips = await prisma.activeBusTrip.findMany({
      where: { branchId },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      },
      orderBy: { startedAt: 'desc' },
      take: 25
    });

    const enriched = trips.map((t) => ({
      ...t,
      stopEtas: computeStopEtas(t.route?.stops || [], t)
    }));
    res.json({ success: true, trips: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trips/start', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { routeId, lat, lng } = req.body;
    if (!routeId) return res.status(400).json({ success: false, message: 'routeId is required.' });

    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, branchId },
      include: {
        vehicle: true,
        stops: { orderBy: { sequenceOrder: 'asc' } }
      }
    });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });

    const existingActive = await prisma.activeBusTrip.findFirst({
      where: { routeId: route.id, status: { in: ['IN_PROGRESS', 'DELAYED'] } },
      include: { vehicle: true, route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } } }
    });
    if (existingActive) {
      return res.json({
        success: true,
        alreadyActive: true,
        trip: { ...existingActive, stopEtas: computeStopEtas(existingActive.route?.stops || [], existingActive) }
      });
    }

    const firstStop = route.stops[0];
    const startLat = lat !== undefined ? Number(lat) : firstStop?.lat ?? 12.925;
    const startLng = lng !== undefined ? Number(lng) : firstStop?.lng ?? 77.5938;

    const trip = await prisma.activeBusTrip.create({
      data: {
        branchId,
        routeId: route.id,
        vehicleId: route.vehicleId,
        driverUserId: req.portalUser.id,
        liveLat: startLat,
        liveLng: startLng,
        speed: 25,
        status: 'IN_PROGRESS',
        currentStopOrder: 1
      },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      }
    });

    res.status(201).json({
      success: true,
      trip: { ...trip, stopEtas: computeStopEtas(trip.route?.stops || [], trip) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Smartphone Telemetry Endpoint:
 * Streams periodic GPS coordinates during active trip hours and calculates live ETA to each upcoming stop.
 */
router.post('/trips/:tripId/telemetry', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { lat, lng, speed, currentStopOrder } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng coordinates are required.' });
    }

    const existing = await prisma.activeBusTrip.findFirst({
      where: { id: req.params.tripId, branchId }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Active trip not found.' });
    if (existing.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Trip has already ended.' });
    }

    const trip = await prisma.activeBusTrip.update({
      where: { id: existing.id },
      data: {
        liveLat: Number(lat),
        liveLng: Number(lng),
        speed: speed !== undefined ? Number(speed) : existing.speed,
        currentStopOrder: currentStopOrder !== undefined ? Number(currentStopOrder) : existing.currentStopOrder
      },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      }
    });

    res.json({
      success: true,
      trip: { ...trip, stopEtas: computeStopEtas(trip.route?.stops || [], trip) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trips/:tripId/arrive-stop', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.activeBusTrip.findFirst({
      where: { id: req.params.tripId, branchId },
      include: { route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } } }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Trip not found.' });
    if (existing.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Trip has already ended.' });
    }

    const stops = existing.route?.stops || [];
    const arrivedOrder = Number(req.body.stopOrder || existing.currentStopOrder);
    const arrivedStop = stops.find((s) => s.sequenceOrder === arrivedOrder);
    const maxOrder = stops.length > 0 ? stops[stops.length - 1].sequenceOrder : arrivedOrder;
    const nextOrder = Math.min(maxOrder, arrivedOrder + 1);

    const trip = await prisma.activeBusTrip.update({
      where: { id: existing.id },
      data: {
        currentStopOrder: nextOrder,
        liveLat: arrivedStop ? arrivedStop.lat : existing.liveLat,
        liveLng: arrivedStop ? arrivedStop.lng : existing.liveLng
      },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      }
    });

    res.json({
      success: true,
      trip: { ...trip, stopEtas: computeStopEtas(trip.route?.stops || [], trip) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trips/:tripId/delay', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { delayMinutes, delayMessage } = req.body;
    const existing = await prisma.activeBusTrip.findFirst({ where: { id: req.params.tripId, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const trip = await prisma.activeBusTrip.update({
      where: { id: existing.id },
      data: {
        status: 'DELAYED',
        delayMinutes: Number(delayMinutes) || 15,
        delayMessage: delayMessage?.trim() || 'Traffic congestion on route. Bus is running behind schedule.'
      },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      }
    });

    res.json({
      success: true,
      trip: { ...trip, stopEtas: computeStopEtas(trip.route?.stops || [], trip) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trips/:tripId/end', requireRole(...DRIVER_AND_MANAGER_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.activeBusTrip.findFirst({ where: { id: req.params.tripId, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const trip = await prisma.activeBusTrip.update({
      where: { id: existing.id },
      data: { status: 'COMPLETED', endedAt: new Date(), speed: 0 },
      include: {
        vehicle: true,
        route: { include: { stops: { orderBy: { sequenceOrder: 'asc' } } } }
      }
    });

    res.json({
      success: true,
      trip: { ...trip, stopEtas: computeStopEtas(trip.route?.stops || [], trip) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// STUDENT / PARENT LIVE BUS TRACKER
// ----------------------------------------------------------------------------

router.get('/my-bus', async (req, res) => {
  try {
    const user = req.portalUser;
    let studentId = req.query.studentId;

    if (user.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      studentId = sp?.id;
    } else if (user.role === 'PARENT') {
      const pp = await prisma.parentProfile.findUnique({
        where: { userId: user.id },
        include: { children: true }
      });
      const childIds = (pp?.children || []).map((c) => c.studentId);
      if (!studentId || !childIds.includes(studentId)) {
        studentId = childIds[0] || null;
      }
    }

    if (!studentId) {
      return res.json({ success: true, allocation: null, activeTrip: null, stopEtas: [] });
    }

    const allocation = await prisma.studentTransportAllocation.findUnique({
      where: { studentId },
      include: {
        stop: true,
        route: {
          include: {
            vehicle: true,
            stops: { orderBy: { sequenceOrder: 'asc' } }
          }
        }
      }
    });

    if (!allocation) {
      return res.json({ success: true, allocation: null, activeTrip: null, stopEtas: [] });
    }

    const activeTrip = await prisma.activeBusTrip.findFirst({
      where: {
        routeId: allocation.routeId,
        status: { in: ['IN_PROGRESS', 'DELAYED'] }
      },
      orderBy: { startedAt: 'desc' }
    });

    const latestTrip =
      activeTrip ||
      (await prisma.activeBusTrip.findFirst({
        where: { routeId: allocation.routeId },
        orderBy: { startedAt: 'desc' }
      }));

    const stopEtas = computeStopEtas(allocation.route.stops, latestTrip);

    res.json({
      success: true,
      allocation,
      activeTrip: latestTrip,
      stopEtas
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
