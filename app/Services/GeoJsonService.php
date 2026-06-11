<?php

namespace App\Services;

class GeoJsonService
{
    private static ?array $features = null;

    private static function load(): void
    {
        if (self::$features !== null) return;

        $path = base_path('chittar_data/boundaries/pakistan_districts_adm3.geojson');
        $geojson = json_decode(file_get_contents($path), true);
        self::$features = $geojson['features'];
    }

    public function findDistrict(float $lat, float $lon): ?array
    {
        self::load();

        foreach (self::$features as $feature) {
            $geometry = $feature['geometry'];
            if ($this->pointInFeature($lat, $lon, $geometry)) {
                return $feature['properties'];
            }
        }

        return null;
    }

    private function pointInFeature(float $lat, float $lon, array $geometry): bool
    {
        if ($geometry['type'] === 'Polygon') {
            return $this->pointInPolygon($lat, $lon, $geometry['coordinates'][0]);
        }

        if ($geometry['type'] === 'MultiPolygon') {
            foreach ($geometry['coordinates'] as $polygon) {
                if ($this->pointInPolygon($lat, $lon, $polygon[0])) {
                    return true;
                }
            }
        }

        return false;
    }

    private function pointInPolygon(float $lat, float $lon, array $ring): bool
    {
        $inside = false;
        $n = count($ring);

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $ring[$i][0]; // longitude
            $yi = $ring[$i][1]; // latitude
            $xj = $ring[$j][0];
            $yj = $ring[$j][1];

            if ((($yi > $lat) !== ($yj > $lat)) &&
                ($lon < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)) {
                $inside = !$inside;
            }
        }

        return $inside;
    }
}
