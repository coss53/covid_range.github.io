<?php 
$server = 'localhost';
$username = 'postgres';
$password = '136902';
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
