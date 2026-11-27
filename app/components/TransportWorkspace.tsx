import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { AnimatedHoverCard, AnimatedButton } from './AnimatedUI';

interface TransportWorkspaceProps {
  mode: 'admin' | 'driver' | 'member';
  studentId?: string;
}

type AdminSubTab = 'fleet' | 'routes' | 'allocations' | 'trips' | 'driver';

export const TransportWorkspace: React.FC<TransportWorkspaceProps> = ({ mode, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [subTab, setSubTab] = useState<AdminSubTab>(mode === 'driver' ? 'driver' : 'fleet');

  // Admin / Driver Data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  // Vehicle Form
  const [busNumber, setBusNumber] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('2027-06-30');
  const [fitnessExpiry, setFitnessExpiry] = useState('2027-06-30');
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState('2027-06-30');

  // Route & Stop Form
  const [routeCode, setRouteCode] = useState('');
  const [routeName, setRouteName] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [stopRouteId, setStopRouteId] = useState('');
  const [stopName, setStopName] = useState('');
  const [stopLat, setStopLat] = useState('12.9100');
  const [stopLng, setStopLng] = useState('77.5800');
  const [stopTime, setStopTime] = useState('07:50');

  // Allocation Form
  const [allocStudentEmail, setAllocStudentEmail] = useState('');
  const [allocRouteId, setAllocRouteId] = useState('');
  const [allocStopId, setAllocStopId] = useState('');

  // Driver Trip Mode
  const [driverRouteId, setDriverRouteId] = useState('');
  const [isStreamingGps, setIsStreamingGps] = useState(false);
  const gpsTimerRef = useRef<any>(null);

  // Member Live Bus Tracker
  const [myBus, setMyBus] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === 'member') {
        const res = await api.getMyBus(studentId);
        setMyBus(res);
      } else {
        const [vRes, rRes, tRes] = await Promise.allSettled([
          api.getTransportVehicles(),
          api.getTransportRoutes(),
          api.getTransportTrips()
        ]);
        if (vRes.status === 'fulfilled') {
          const vList = vRes.value.vehicles || [];
          setVehicles(vList);
          if (vList.length > 0 && !selectedVehicleId) setSelectedVehicleId(vList[0].id);
        }
        if (rRes.status === 'fulfilled') {
          const rList = rRes.value.routes || [];
          setRoutes(rList);
          if (rList.length > 0) {
            if (!stopRouteId) setStopRouteId(rList[0].id);
            if (!allocRouteId) {
              setAllocRouteId(rList[0].id);
              if (rList[0].stops?.length > 0) setAllocStopId(rList[0].stops[0].id);
            }
            if (!driverRouteId) setDriverRouteId(rList[0].id);
          }
        }
        if (tRes.status === 'fulfilled') setTrips(tRes.value.trips || []);

        if (mode === 'admin') {
          const [cRes, aRes] = await Promise.allSettled([
            api.getTransportComplianceAlerts(),
            api.getTransportAllocations()
          ]);
          if (cRes.status === 'fulfilled') setComplianceAlerts(cRes.value.alerts || []);
          if (aRes.status === 'fulfilled') setAllocations(aRes.value.allocations || []);
        }
      }
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
    };
  }, [mode, studentId]);

  const handleAddVehicle = async () => {
    if (!busNumber.trim() || !registrationNo.trim() || !driverName.trim() || !driverPhone.trim()) {
      setNotice('⚠️ Please fill in Bus Number, Registration No, Driver Name, and Phone.');
      return;
    }
    try {
      await api.createTransportVehicle({
        busNumber,
        registrationNo,
        capacity: Number(capacity) || 40,
        driverName,
        driverPhone,
        insuranceExpiry,
        fitnessExpiry,
        driverLicenseExpiry
      });
      setNotice('✅ Vehicle & driver added to branch fleet.');
      setBusNumber('');
      setRegistrationNo('');
      setDriverName('');
      setDriverPhone('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleAddRoute = async () => {
    if (!routeCode.trim() || !routeName.trim() || !selectedVehicleId) {
      setNotice('⚠️ Enter Route Code, Route Name, and select a Vehicle.');
      return;
    }
    try {
      await api.createTransportRoute({ vehicleId: selectedVehicleId, routeCode, routeName });
      setNotice('✅ Transport route created.');
      setRouteCode('');
      setRouteName('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleAddStop = async () => {
    if (!stopRouteId || !stopName.trim()) {
      setNotice('⚠️ Select a route and enter Stop Name.');
      return;
    }
    try {
      await api.addRouteStop(stopRouteId, {
        stopName,
        lat: Number(stopLat),
        lng: Number(stopLng),
        scheduledTime: stopTime
      });
      setNotice('✅ Stop added to route.');
      setStopName('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleAllocateSeat = async () => {
    if (!allocStudentEmail.trim() || !allocRouteId || !allocStopId) {
      setNotice('⚠️ Enter Student Email/Admission No, Route, and Boarding Stop.');
      return;
    }
    try {
      await api.createTransportAllocation({
        emailOrAdmission: allocStudentEmail.trim(),
        routeId: allocRouteId,
        stopId: allocStopId
      });
      setNotice('✅ Student seat allocated successfully.');
      setAllocStudentEmail('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const activeDriverTrip = trips.find((t) => t.status === 'IN_PROGRESS' || t.status === 'DELAYED');

  const sendTelemetryPing = async (trip: any) => {
    try {
      const sendCoords = async (lat: number, lng: number, speed: number) => {
        await api.sendBusTelemetry(trip.id, { lat, lng, speed });
        setNotice(`📡 Live GPS ping sent (${lat.toFixed(4)}, ${lng.toFixed(4)} • ${speed} km/h)`);
        loadData();
      };

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32;
            sendCoords(pos.coords.latitude, pos.coords.longitude, spd);
          },
          () => {
            // Fallback simulated movement toward next stop when browser geolocation is denied/unavailable
            const nextStop = (trip.route?.stops || []).find((s: any) => s.sequenceOrder === trip.currentStopOrder);
            const targetLat = nextStop ? (trip.liveLat + nextStop.lat) / 2 : trip.liveLat - 0.004;
            const targetLng = nextStop ? (trip.liveLng + nextStop.lng) / 2 : trip.liveLng - 0.004;
            sendCoords(targetLat, targetLng, 30);
          },
          { timeout: 3000 }
        );
      } else {
        await sendCoords(trip.liveLat - 0.003, trip.liveLng - 0.003, 30);
      }
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const toggleGpsStream = (trip: any) => {
    if (isStreamingGps) {
      if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
      setIsStreamingGps(false);
      setNotice('⏹️ Stopped automatic GPS streaming.');
    } else {
      setIsStreamingGps(true);
      sendTelemetryPing(trip);
      gpsTimerRef.current = setInterval(() => {
        sendTelemetryPing(trip);
      }, 6000);
    }
  };

  const selectedAllocRoute = routes.find((r) => r.id === allocRouteId);

  return (
    <View style={styles.wrapper}>
      {notice ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Hero Banner */}
      <AnimatedHoverCard style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>
            {mode === 'member' ? '🚌 Live School Bus Tracker' : '🚌 Transport Fleet & Live Smartphone Bus ETA'}
          </Text>
          <Text style={styles.heroSub}>
            {mode === 'member'
              ? 'Real-time bus GPS location, stop-by-stop live ETA, and instant delay alerts.'
              : 'Manage vehicles, 30-day compliance alerts, stop-wise routes, strict seat capacity & driver smartphone telemetry.'}
          </Text>
        </View>
        {mode === 'member' && (
          <AnimatedButton style={styles.primaryBtn} onPress={loadData}>
            <Text style={styles.primaryBtnText}>🔄 Refresh Live ETA</Text>
          </AnimatedButton>
        )}
      </AnimatedHoverCard>

      {/* Admin / Driver Sub-tabs */}
      {mode !== 'member' && (
        <View style={styles.subTabRow}>
          {(mode === 'admin'
            ? [
                { id: 'fleet', label: `🛡️ Fleet & Compliance (${complianceAlerts.length} Alerts)` },
                { id: 'routes', label: `🗺️ Routes & Stops (${routes.length})` },
                { id: 'allocations', label: `💺 Seat Allocations (${allocations.length})` },
                { id: 'trips', label: `📡 Live Trips (${trips.filter((t) => t.status !== 'COMPLETED').length})` },
                { id: 'driver', label: '📱 Driver Trip Mode' }
              ]
            : [{ id: 'driver', label: '📱 Driver Trip Mode' }]
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.subTabPill, subTab === t.id && styles.subTabPillActive]}
              onPress={() => setSubTab(t.id as AdminSubTab)}
            >
              <Text style={[styles.subTabText, subTab === t.id && styles.subTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#1D4ED8" style={{ marginVertical: 24 }} />}

      {/* ADMIN: FLEET & COMPLIANCE */}
      {mode === 'admin' && subTab === 'fleet' && (
        <View style={styles.sectionStack}>
          {complianceAlerts.length > 0 && (
            <AnimatedHoverCard style={styles.alertCard}>
              <Text style={styles.alertTitle}>⚠️ 30-Day Compliance Expiry Alerts ({complianceAlerts.length})</Text>
              {complianceAlerts.map((a, idx) => (
                <Text key={idx} style={styles.alertItem}>
                  • {a.busNumber} ({a.registrationNo}) — {a.label}:{' '}
                  {a.isExpired ? `EXPIRED (${Math.abs(a.daysRemaining)}d ago)` : `Expires in ${a.daysRemaining} days`}
                </Text>
              ))}
            </AnimatedHoverCard>
          )}

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Register Bus & Driver</Text>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Bus No (e.g. BUS-BLR-03)" value={busNumber} onChangeText={setBusNumber} />
              <TextInput style={styles.input} placeholder="Reg No (KA-05-SK-2028)" value={registrationNo} onChangeText={setRegistrationNo} />
              <TextInput style={styles.input} placeholder="Seat Capacity" value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Driver Name" value={driverName} onChangeText={setDriverName} />
              <TextInput style={styles.input} placeholder="Driver Phone" value={driverPhone} onChangeText={setDriverPhone} />
              <TextInput style={styles.input} placeholder="Insurance Expiry (YYYY-MM-DD)" value={insuranceExpiry} onChangeText={setInsuranceExpiry} />
              <TextInput style={styles.input} placeholder="Fitness Expiry (YYYY-MM-DD)" value={fitnessExpiry} onChangeText={setFitnessExpiry} />
              <TextInput style={styles.input} placeholder="License Expiry (YYYY-MM-DD)" value={driverLicenseExpiry} onChangeText={setDriverLicenseExpiry} />
            </View>
            <AnimatedButton style={styles.primaryBtn} onPress={handleAddVehicle}>
              <Text style={styles.primaryBtnText}>Add Vehicle</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Branch Fleet ({vehicles.length})</Text>
            {vehicles.map((v) => (
              <View key={v.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {v.busNumber} • {v.registrationNo} ({v.capacity} Seats)
                  </Text>
                  <Text style={styles.itemSub}>
                    Driver: {v.driverName} ({v.driverPhone})
                  </Text>
                  <Text style={styles.itemSub}>
                    Ins: {new Date(v.insuranceExpiry).toLocaleDateString()} • Fit: {new Date(v.fitnessExpiry).toLocaleDateString()} • Lic:{' '}
                    {new Date(v.driverLicenseExpiry).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.rightControls}>
                  {v.complianceAlerts?.length > 0 ? (
                    <View style={styles.warnBadge}>
                      <Text style={styles.warnBadgeText}>{v.complianceAlerts.length} Expiry Alert</Text>
                    </View>
                  ) : (
                    <View style={styles.okBadge}>
                      <Text style={styles.okBadgeText}>Compliant</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={async () => {
                      await api.deleteTransportVehicle(v.id);
                      loadData();
                    }}
                  >
                    <Text style={styles.dangerBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: ROUTES & STOP BUILDER */}
      {mode === 'admin' && subTab === 'routes' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Create Transport Route</Text>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Route Code (e.g. RT-BLR-02)" value={routeCode} onChangeText={setRouteCode} />
              <TextInput style={styles.input} placeholder="Route Name" value={routeName} onChangeText={setRouteName} />
            </View>
            <Text style={styles.fieldLabel}>Assign Vehicle:</Text>
            <View style={styles.chipRow}>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.chip, selectedVehicleId === v.id && styles.chipActive]}
                  onPress={() => setSelectedVehicleId(v.id)}
                >
                  <Text style={[styles.chipText, selectedVehicleId === v.id && styles.chipTextActive]}>{v.busNumber}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <AnimatedButton style={styles.primaryBtn} onPress={handleAddRoute}>
              <Text style={styles.primaryBtnText}>Create Route</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Stop-Wise Route Builder</Text>
            <View style={styles.chipRow}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, stopRouteId === r.id && styles.chipActive]}
                  onPress={() => setStopRouteId(r.id)}
                >
                  <Text style={[styles.chipText, stopRouteId === r.id && styles.chipTextActive]}>{r.routeCode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Stop Name" value={stopName} onChangeText={setStopName} />
              <TextInput style={styles.input} placeholder="Latitude (e.g. 12.91)" value={stopLat} onChangeText={setStopLat} />
              <TextInput style={styles.input} placeholder="Longitude (e.g. 77.58)" value={stopLng} onChangeText={setStopLng} />
              <TextInput style={styles.input} placeholder="Scheduled Time (07:50)" value={stopTime} onChangeText={setStopTime} />
            </View>
            <AnimatedButton style={styles.primaryBtn} onPress={handleAddStop}>
              <Text style={styles.primaryBtnText}>Add Stop to Route</Text>
            </AnimatedButton>

            {routes.map((r) => (
              <View key={r.id} style={styles.routeBlock}>
                <Text style={styles.itemTitle}>
                  {r.routeCode}: {r.routeName} (Bus: {r.vehicle?.busNumber} • {r._count?.allocations || 0}/{r.vehicle?.capacity} Seats)
                </Text>
                {(r.stops || []).map((s: any) => (
                  <View key={s.id} style={styles.stopRow}>
                    <Text style={styles.itemSub}>
                      #{s.sequenceOrder} {s.stopName} • {s.scheduledTime} ({s.lat.toFixed(4)}, {s.lng.toFixed(4)})
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await api.deleteRouteStop(s.id);
                        loadData();
                      }}
                    >
                      <Text style={styles.dangerBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: SEAT ALLOCATIONS */}
      {mode === 'admin' && subTab === 'allocations' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Allocate Student Bus Seat (Strict Capacity Enforced)</Text>
            <TextInput
              style={styles.input}
              placeholder="Student Email or Admission No (e.g. student2.blr@skanda.edu.in)"
              value={allocStudentEmail}
              onChangeText={setAllocStudentEmail}
            />
            <Text style={styles.fieldLabel}>Select Route:</Text>
            <View style={styles.chipRow}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, allocRouteId === r.id && styles.chipActive]}
                  onPress={() => {
                    setAllocRouteId(r.id);
                    if (r.stops?.length > 0) setAllocStopId(r.stops[0].id);
                  }}
                >
                  <Text style={[styles.chipText, allocRouteId === r.id && styles.chipTextActive]}>
                    {r.routeCode} ({r._count?.allocations || 0}/{r.vehicle?.capacity})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedAllocRoute?.stops?.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Select Boarding Stop:</Text>
                <View style={styles.chipRow}>
                  {selectedAllocRoute.stops.map((s: any) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, allocStopId === s.id && styles.chipActive]}
                      onPress={() => setAllocStopId(s.id)}
                    >
                      <Text style={[styles.chipText, allocStopId === s.id && styles.chipTextActive]}>{s.stopName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <AnimatedButton style={styles.primaryBtn} onPress={handleAllocateSeat}>
              <Text style={styles.primaryBtnText}>Assign Seat</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Allocated Students ({allocations.length})</Text>
            {allocations.map((a) => (
              <View key={a.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {a.student?.user?.fullName} ({a.student?.admissionNo})
                  </Text>
                  <Text style={styles.itemSub}>
                    Route: {a.route?.routeCode} ({a.route?.vehicle?.busNumber}) • Stop: {a.stop?.stopName} ({a.stop?.scheduledTime})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={async () => {
                    await api.deleteTransportAllocation(a.id);
                    loadData();
                  }}
                >
                  <Text style={styles.dangerBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: LIVE TRIPS & ONE-CLICK DELAY BROADCAST */}
      {mode === 'admin' && subTab === 'trips' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Live Bus Trips & One-Click Delay Broadcasts</Text>
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>No trips recorded yet. Use Driver Trip Mode to start a trip.</Text>
          ) : (
            trips.map((t) => (
              <View key={t.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {t.route?.routeCode} ({t.vehicle?.busNumber}) — {t.status}
                  </Text>
                  <Text style={styles.itemSub}>
                    GPS: ({t.liveLat.toFixed(4)}, {t.liveLng.toFixed(4)}) • Speed: {t.speed} km/h • Current Stop #{t.currentStopOrder}
                  </Text>
                  {t.delayMessage ? <Text style={styles.delayInline}>⚠️ {t.delayMessage}</Text> : null}
                </View>
                {t.status !== 'COMPLETED' && (
                  <View style={styles.rightControls}>
                    <AnimatedButton
                      style={styles.warnBtn}
                      onPress={async () => {
                        await api.broadcastBusDelay(t.id, {
                          delayMinutes: 15,
                          delayMessage: 'Heavy traffic on route — bus delayed by 15 mins.'
                        });
                        setNotice('📢 Delay alert broadcasted to parents & students.');
                        loadData();
                      }}
                    >
                      <Text style={styles.warnBtnText}>Broadcast +15m Delay</Text>
                    </AnimatedButton>
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={async () => {
                        await api.endBusTrip(t.id);
                        loadData();
                      }}
                    >
                      <Text style={styles.dangerBtnText}>End Trip</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </AnimatedHoverCard>
      )}

      {/* DRIVER TRIP MODE (MOBILE-FRIENDLY) */}
      {mode !== 'member' && subTab === 'driver' && (
        <View style={styles.sectionStack}>
          {!activeDriverTrip ? (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>📱 Driver Trip Mode — Start Route</Text>
              <Text style={styles.itemSub}>Select your assigned route and tap Start Trip to stream smartphone GPS & live ETAs.</Text>
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {routes.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, driverRouteId === r.id && styles.chipActive]}
                    onPress={() => setDriverRouteId(r.id)}
                  >
                    <Text style={[styles.chipText, driverRouteId === r.id && styles.chipTextActive]}>
                      {r.routeCode} ({r.vehicle?.busNumber})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!driverRouteId) return;
                  await api.startBusTrip({ routeId: driverRouteId });
                  setNotice('✅ Trip started! Smartphone telemetry is ready.');
                  loadData();
                }}
              >
                <Text style={styles.primaryBtnText}>▶ Start Trip</Text>
              </AnimatedButton>
            </AnimatedHoverCard>
          ) : (
            <AnimatedHoverCard style={styles.card}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.cardTitle}>
                    🟢 Active Trip: {activeDriverTrip.route?.routeCode} ({activeDriverTrip.vehicle?.busNumber})
                  </Text>
                  <Text style={styles.itemSub}>
                    Live GPS: ({activeDriverTrip.liveLat.toFixed(4)}, {activeDriverTrip.liveLng.toFixed(4)}) • {activeDriverTrip.speed} km/h
                  </Text>
                </View>
                <View style={styles.rightControls}>
                  <AnimatedButton style={styles.primaryBtn} onPress={() => toggleGpsStream(activeDriverTrip)}>
                    <Text style={styles.primaryBtnText}>
                      {isStreamingGps ? '⏹ Stop Auto-GPS' : '📡 Stream Smartphone GPS'}
                    </Text>
                  </AnimatedButton>
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => sendTelemetryPing(activeDriverTrip)}>
                    <Text style={styles.outlineBtnText}>Ping GPS Now</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Route Stops & Arrival Check-In:</Text>
              {(activeDriverTrip.stopEtas || []).map((s: any) => (
                <View key={s.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      #{s.sequenceOrder} {s.stopName} ({s.scheduledTime})
                    </Text>
                    <Text style={styles.itemSub}>
                      {s.passed ? '✅ Departed' : `ETA: ${s.etaMinutes} min (${s.distanceKm} km away)`}
                    </Text>
                  </View>
                  {!s.passed && (
                    <AnimatedButton
                      style={styles.primaryBtn}
                      onPress={async () => {
                        await api.arriveBusStop(activeDriverTrip.id, s.sequenceOrder);
                        setNotice(`✅ Marked arrival at ${s.stopName}`);
                        loadData();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Mark Arrived</Text>
                    </AnimatedButton>
                  )}
                </View>
              ))}

              <View style={[styles.rightControls, { marginTop: 16 }]}>
                <AnimatedButton
                  style={styles.warnBtn}
                  onPress={async () => {
                    await api.broadcastBusDelay(activeDriverTrip.id, {
                      delayMinutes: 10,
                      delayMessage: 'Driver reported 10-minute traffic delay.'
                    });
                    setNotice('📢 Delay broadcast sent!');
                    loadData();
                  }}
                >
                  <Text style={styles.warnBtnText}>⚠️ Report +10m Delay</Text>
                </AnimatedButton>
                <AnimatedButton
                  style={styles.dangerSolidBtn}
                  onPress={async () => {
                    if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
                    setIsStreamingGps(false);
                    await api.endBusTrip(activeDriverTrip.id);
                    setNotice('🏁 Trip completed.');
                    loadData();
                  }}
                >
                  <Text style={styles.primaryBtnText}>⏹ End Trip</Text>
                </AnimatedButton>
              </View>
            </AnimatedHoverCard>
          )}
        </View>
      )}

      {/* PARENT / STUDENT LIVE BUS TRACKER */}
      {mode === 'member' && (
        <View style={styles.sectionStack}>
          {!myBus?.allocation ? (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.emptyText}>No school bus route is currently allocated to this student profile.</Text>
            </AnimatedHoverCard>
          ) : (
            <>
              {myBus.activeTrip?.status === 'DELAYED' && (
                <View style={styles.delayBanner}>
                  <Text style={styles.delayBannerTitle}>
                    ⚠️ Bus Delay Alert (+{myBus.activeTrip.delayMinutes} mins)
                  </Text>
                  <Text style={styles.delayBannerSub}>{myBus.activeTrip.delayMessage}</Text>
                </View>
              )}

              <AnimatedHoverCard style={styles.card}>
                <Text style={styles.cardTitle}>
                  Route {myBus.allocation.route?.routeCode}: {myBus.allocation.route?.routeName}
                </Text>
                <Text style={styles.itemSub}>
                  Bus: {myBus.allocation.route?.vehicle?.busNumber} ({myBus.allocation.route?.vehicle?.registrationNo}) • Driver:{' '}
                  {myBus.allocation.route?.vehicle?.driverName} ({myBus.allocation.route?.vehicle?.driverPhone})
                </Text>
                <Text style={styles.boardingBadge}>
                  Boarding Stop: #{myBus.allocation.stop?.sequenceOrder} {myBus.allocation.stop?.stopName} (Scheduled{' '}
                  {myBus.allocation.stop?.scheduledTime})
                </Text>

                {myBus.activeTrip ? (
                  <View style={styles.liveGpsBox}>
                    <Text style={styles.liveGpsTitle}>
                      📡 Live Bus Status: {myBus.activeTrip.status} • Speed: {myBus.activeTrip.speed} km/h
                    </Text>
                    <Text style={styles.itemSub}>
                      Coordinates: ({myBus.activeTrip.liveLat.toFixed(4)}, {myBus.activeTrip.liveLng.toFixed(4)}) • Updated:{' '}
                      {new Date(myBus.activeTrip.updatedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>Bus trip has not started yet today.</Text>
                )}
              </AnimatedHoverCard>

              <AnimatedHoverCard style={styles.card}>
                <Text style={styles.cardTitle}>Interactive Route Timeline & Live Stop ETAs</Text>
                {(myBus.stopEtas || []).map((s: any) => {
                  const isMyStop = s.id === myBus.allocation.stopId;
                  return (
                    <View key={s.id} style={[styles.timelineRow, isMyStop && styles.timelineRowMine]}>
                      <View
                        style={[
                          styles.timelineDot,
                          s.passed ? styles.dotPassed : s.isCurrent ? styles.dotCurrent : styles.dotUpcoming
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>
                          #{s.sequenceOrder} {s.stopName} {isMyStop ? '⭐ (Your Stop)' : ''}
                        </Text>
                        <Text style={styles.itemSub}>
                          Scheduled: {s.scheduledTime}
                          {s.distanceKm !== null ? ` • ${s.distanceKm} km away` : ''}
                        </Text>
                      </View>
                      <View style={[styles.etaPill, s.passed ? styles.etaPassed : styles.etaLive]}>
                        <Text style={s.passed ? styles.etaPassedText : styles.etaLiveText}>
                          {s.passed ? 'Departed' : s.etaMinutes !== null ? `ETA ${s.etaMinutes} min` : 'Scheduled'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </AnimatedHoverCard>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    borderRadius: borderRadius.md
  },
  noticeText: { color: '#1E3A8A', fontWeight: '600', flex: 1 },
  dismissText: { color: '#1D4ED8', fontWeight: '800', fontSize: 16, paddingLeft: 12 },
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  subTabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  subTabPillActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  subTabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  subTabTextActive: { color: '#FFFFFF' },
  sectionStack: { gap: spacing.md },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  alertTitle: { fontSize: 15, fontWeight: '800', color: '#991B1B', marginBottom: 6 },
  alertItem: { fontSize: 13, color: '#7F1D1D', marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    minWidth: 190,
    flex: 1,
    marginBottom: spacing.xs
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.md
  },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  warnBtn: { backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#FDE68A' },
  warnBtnText: { color: '#92400E', fontWeight: '700', fontSize: 13 },
  dangerSolidBtn: { backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md },
  listRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: spacing.sm
  },
  routeBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingLeft: 10 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rightControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  okBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  okBadgeText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  warnBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  warnBadgeText: { color: '#991B1B', fontSize: 12, fontWeight: '700' },
  dangerBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm },
  dangerBtnText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  delayInline: { color: '#B45309', fontSize: 12, fontWeight: '700', marginTop: 4 },
  delayBanner: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', borderRadius: borderRadius.lg, padding: spacing.md },
  delayBannerTitle: { color: '#92400E', fontWeight: '800', fontSize: 15 },
  delayBannerSub: { color: '#78350F', fontSize: 13, marginTop: 2 },
  boardingBadge: { marginTop: 8, color: '#1D4ED8', fontWeight: '700', fontSize: 13 },
  liveGpsBox: { marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: borderRadius.md, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  liveGpsTitle: { color: '#1E3A8A', fontWeight: '800', fontSize: 13 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderRadius: borderRadius.sm
  },
  timelineRowMine: { backgroundColor: '#EFF6FF' },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  dotPassed: { backgroundColor: '#16A34A' },
  dotCurrent: { backgroundColor: '#1D4ED8' },
  dotUpcoming: { backgroundColor: '#CBD5E1' },
  etaPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  etaPassed: { backgroundColor: '#F1F5F9' },
  etaLive: { backgroundColor: '#DBEAFE' },
  etaPassedText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  etaLiveText: { color: '#1E40AF', fontSize: 12, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 13, fontStyle: 'italic' }
});
