import asyncio
from drone.drone_client import DroneClient

async def run():
    drone = DroneClient()
    await drone.connect()
    await drone.ensure_altitude(5.0)

asyncio.run(run())