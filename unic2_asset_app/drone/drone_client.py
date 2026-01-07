import asyncio
from mavsdk import System

class DroneClient:
    def __init__(self):
        self.drone = System()

    async def connect(self, address="udpin://127.0.0.1:14540"):
        await self.drone.connect(system_address=address)
        async for state in self.drone.core.connection_state():
            if state.is_connected:
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

        t_end = asyncio.get_event_loop().time() + timeout_s
        async for pos in self.drone.telemetry.position():
            if abs(pos.relative_altitude_m - target_rel_alt_m) <= tol:
                return True
            if asyncio.get_event_loop().time() > t_end:
                print(
                    f"Altitude not reached in {timeout_s}s: "
                    f"target={target_rel_alt_m}, now={pos.relative_altitude_m}"
                )
                return False