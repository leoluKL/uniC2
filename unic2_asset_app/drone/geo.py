import math

EARTH_RADIUS = 6378137.0  # meters

def get_offset_location(lat, lon, d_north, d_east):
    d_lat = d_north / EARTH_RADIUS
    d_lon = d_east / (EARTH_RADIUS * math.cos(math.radians(lat)))
    return (
        lat + math.degrees(d_lat),
        lon + math.degrees(d_lon),
    )

def get_distance_m(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points on Earth in meters 
    (equirectangular approximation for small distances).
    """
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    # Use Haversine formula for better accuracy
    a = math.sin(d_lat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS * c