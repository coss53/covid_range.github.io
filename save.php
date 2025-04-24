<?php
include 'db.php';

// Get POST data
$name = $_POST['username'] ?? '';
$cond = $_POST['usercond'] ?? '';
$long = $_POST['userlong'] ?? 0;
$lat = $_POST['userlat'] ?? 0;

// Safe insert using parameters
$sql = "INSERT INTO public.entries (name, \"condition\", geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))";

$result = pg_query_params($bdcon, $sql, array($name, $cond, $long, $lat));

// Return JSON response
if ($result) {
    echo json_encode([
        'statusCode' => 200,
        'message' => 'Data inserted successfully'
    ]);
} else {
    echo json_encode([
        'statusCode' => 500,
        'message' => 'Database error: ' . pg_last_error($bdcon)
    ]);
}
?>


