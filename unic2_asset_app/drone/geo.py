import math

EARTH_RADIUS = 6378137.0  # meters

def offset_latlon(lat, lon, d_north, d_east):
    d_lat = d_north / EARTH_RADIUS
    d_lon = d_east / (EARTH_RADIUS * math.cos(math.radians(lat)))
    return (
        lat + math.degrees(d_lat),
        lon + math.degrees(d_lon),
    )