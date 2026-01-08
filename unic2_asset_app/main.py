import asyncio
from drone.drone_client import DroneClient

async def run():
    drone = DroneClient()
    await drone.connect()
    await drone.ensure_altitude(11.0)

    await drone.set_speeds(xy=6.0, up=1.0, down=1.0)
    await drone.goto_relative_offset(east_m=-0, north_m=-60, target_rel_alt_m=0, timeout_s=60)
    await drone.goto_relative_offset(east_m=60, north_m=0, target_rel_alt_m=0, timeout_s=60)

asyncio.run(run())