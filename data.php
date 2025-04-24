<?php
include 'db.php';
header('Content-Type: application/json');

$get_sql = "SELECT name, \"condition\", ST_AsGeoJSON(geom) as geojson FROM entries";
$result = pg_query($bdcon, $get_sql);

if (!$result) {
    echo json_encode([
        'statusCode' => 500,
        'message' => 'Query failed: ' . pg_last_error($bdcon)
    ]);
    exit;
}

$data = [];
while ($row = pg_fetch_assoc($result)) {
    $data[] = [
        "type" => "Feature",
        "properties" => [
            "name" => $row['name'],
            "condition" => $row['condition']
        ],
        "geometry" => json_decode($row['geojson']) // Ensure it's correctly parsed JSON
    ];
}

echo json_encode([
    "type" => "FeatureCollection",
    "features" => $data
]);
?>
