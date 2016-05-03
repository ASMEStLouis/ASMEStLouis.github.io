<?php
/*
* Caches API calls to a local file which is updated on a
* given time interval.
*/

$cache_file = 'cache-'. $_POST['cacheId'] .'.xml';

if( get_magic_quotes_gpc() ) {
  $config = stripcslashes($_POST['config']);
}
else {
  $config = $_POST['config'];
}

$config = '<?xml version="1.0" encoding="UTF-8"?>' . $config;


// update the cache if past interval time
$fp = fopen($cache_file, 'w+'); // open or create cache

if ($fp) {
    if (flock($fp, LOCK_EX)) {
        fwrite($fp, $config);
        flock($fp, LOCK_UN);
    }

    fclose($fp);
}