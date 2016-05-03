<?php
/*
* Caches API calls to a local file which is updated on a
* given time interval.
*/

$update_interval = $_GET['interval'] * 60; // 10 minutes
$cache_file = 'cache-'. $_GET['cacheId'] .'.xml';


/*
 * Checks the cache file and if the last modified time is lesser than
 * update interval then returns cache contents else returns a "expired" status
 */
if ( !file_exists($cache_file) || (time() - filemtime($cache_file) > $update_interval) ) {
    header('Content-Type: text/xml');
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<novaGallery status="expired"></novaGallery>';
}
else {
    header('Content-Type: text/xml');
    echo file_get_contents($cache_file);
}


