<?php 
$server = 'postgresql://covid_range_user:bwIUYLuFto9IBUg55LJAAzHs0sbD7qSJ@dpg-d0518sngi27c73c7n49g-a.oregon-postgres.render.com/covid_range';
$username = 'covid_range_user';
$password = 'bwIUYLuFto9IBUg55LJAAzHs0sbD7qSJ';
$bd_name = 'covid_range';

$bdcon = pg_connect("host=$server port=5432 dbname=$bd_name user=$username password=$password");

if (!$bdcon) {
    echo json_encode([
        'statusCode' => 500,
        'message' => 'Database connection failed: ' . pg_last_error()
    ]);
    exit;
}
?>
