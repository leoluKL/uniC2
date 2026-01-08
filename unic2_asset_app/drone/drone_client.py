import asyncio
from mavsdk import System
from drone.geo import get_offset_location, get_distance_m

class DroneClient:
    def __init__(self):
        self.drone = System()

    async def connect(self, address="udpin://127.0.0.1:14540"):
        await self.drone.connect(system_address=address)
        async for state in self.drone.core.connection_state():
            if state.is_connected:
                break
        print("Waiting for global position estimate...")
        async for health in self.drone.telemetry.health():
            if health.is_global_position_ok and health.is_home_position_ok:
                print("GPS Lock and Home Position fixed.")
                break


    async def get_position(self):
        async for pos in self.drone.telemetry.position():
            return (
                pos.latitude_deg,
                pos.longitude_deg,
                pos.absolute_altitude_m,
                pos.relative_altitude_m,
            )

    async def set_speeds(self, xy=5.0, up=1.0, down=1.0):
        await self.drone.param.set_param_float("MPC_XY_CRUISE", xy)
        await self.drone.param.set_param_float("MPC_Z_VEL_MAX_UP", up)
        await self.drone.param.set_param_float("MPC_Z_VEL_MAX_DN", down)

    async def ensure_altitude(self, target_rel_alt_m, tol=0.5, timeout_s=30):
        async for in_air in self.drone.telemetry.in_air():
            airborne = in_air
            break

        if not airborne:
            await self.drone.action.arm()
            await self.drone.action.set_takeoff_altitude(target_rel_alt_m)
            await self.drone.action.takeoff()
        else:
            lat, lon, abs_alt, rel_alt = await self.get_position()
            delta = target_rel_alt_m - rel_alt
            await self.drone.action.goto_location(lat, lon, abs_alt + delta, 0)
        print(f"Move to altitude {target_rel_alt_m:.2f}m command sent. Waiting...")

        t_end = asyncio.get_event_loop().time() + timeout_s
        async for pos in self.drone.telemetry.position():
            if abs(pos.relative_altitude_m - target_rel_alt_m) <= tol:
                print(f"Arrived altitude {target_rel_alt_m:.2f}m")
                return True
            if asyncio.get_event_loop().time() > t_end:
                print(
                    f"Altitude not reached in {timeout_s}s: "
                    f"target={target_rel_alt_m}, now={pos.relative_altitude_m}"
                )
                return False
    
    async def goto_relative_offset(self, north_m, east_m, target_rel_alt_m, horiz_tol=1.0, vert_tol=0.5, timeout_s=60):
        """
        Commands the drone to a new location relative to its current GPS coordinates 
        using local offsets in meters and a target relative altitude.
        """
        print(f"Moving delta N {north_m}m, E {east_m}m, Alt {target_rel_alt_m}m")
        current_lat, current_lon, current_abs_alt, current_rel_alt = await self.get_position()
        target_lat, target_lon = get_offset_location(
            current_lat, current_lon, north_m, east_m
        )
        
        # Calculate target absolute altitude
        # We need the absolute altitude for the MAVSDK goto_location command
        if current_rel_alt+target_rel_alt_m<0:
            target_rel_alt_m= -current_rel_alt

        target_abs_alt = current_abs_alt + target_rel_alt_m

        # Command the movement (heading 0 for North)
        await self.drone.action.goto_location(
            target_lat, target_lon, target_abs_alt, 0
        )
        print("Goto command sent. Waiting for arrival...")

        # Verification Loop
        t_end = asyncio.get_event_loop().time() + timeout_s
        async for pos in self.drone.telemetry.position():
            # Check horizontal distance
            dist_horiz = get_distance_m(pos.latitude_deg, pos.longitude_deg,target_lat, target_lon)
            
            # Check vertical distance (relative to target altitude)
            dist_vert = abs(pos.absolute_altitude_m - target_abs_alt)
            
            if dist_horiz <= horiz_tol and dist_vert <= vert_tol:
                print(f"Arrived at target! H_dist: {dist_horiz:.2f}m, V_dist: {dist_vert:.2f}m")
                return True

            if asyncio.get_event_loop().time() > t_end:
                print(
                    f"Timeout ({timeout_s}s): "
                    f"H_dist={dist_horiz:.2f}m (> {horiz_tol}m), "
                    f"V_dist={dist_vert:.2f}m (> {vert_tol}m)"
                )
                return False
