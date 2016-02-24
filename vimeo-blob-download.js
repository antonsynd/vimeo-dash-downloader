#!/usr/bin/env node

//
//  Expects base64_init=0, i.e. init_segment is an mp4 link
//  

(function()
{
	'use strict';
	
	var fs = require('fs');
	var http = require('https');
	var atob = require('atob');
	var argv = require('minimist')(process.argv.slice(2),
	{
		default: {
			'concat': 'false',
			'debug': 'false',
			'base64': 'false',
			'interval': 250,
		},
	});
	
	const MASTER_PATH = argv._[0];
	const SEGMENT_DIR = argv._[1];
	const CONCATENATE_MODE = argv.concat === 'true';
	const DEBUG_MODE = argv.debug === 'true';
	const BASE64_MODE = argv.base64 === 'true';
	const REQUEST_INTERVAL = parseInt(argv.interval);
	var INTERVAL_NUM = NaN;
	
	function trace()
	{
		if (DEBUG_MODE)
		{
			console.log.apply(console, arguments);
		}
	}
	
	function __interval__downloadSegment(baseURL, videoURL, segments)
	{
		var segment = segments.shift();
		
		if (segment)
		{
			downloadSegment(baseURL, videoURL, segment.url);
		}
		else
		{
			clearInterval(INTERVAL_NUM);
		}
	}
	
	function downloadSegment(baseURL, videoURL, segmentURL)
	{
		let segmentFile;

		if (!CONCATENATE_MODE)
		{
			segmentFile = fs.createWriteStream(segmentURL, {autoClose: true}).on('finish', () =>
			{
				trace('downloaded ' + segmentURL);
			});
		}

		var request = http.get(baseURL + videoURL + segmentURL, (response) =>
		{
			response.on('data', (data) =>
			{
				if (CONCATENATE_MODE && concatFile)
				{
					concatFile.write(data);
				}
				else
				{
					segmentFile.write(data);
				}
			}).on('end', (e) =>
			{
				if (CONCATENATE_MODE)
				{
					trace('concatenated ' + segmentURL);
				}
				else
				{
					segmentFile.end();
				}
			}).on('error', (e) =>
			{
				console.error(e);
			});
		}).on('error', (e) =>
		{
			console.error(e);
		});
	}
	
	var masterJSONText = fs.readFileSync(MASTER_PATH, {encoding: 'utf-8'});
	var master = JSON.parse(masterJSONText);
	
	var baseURL = master.__extern__base_url;
	
	process.chdir(SEGMENT_DIR);
	
	var concatFile;
	if (CONCATENATE_MODE)
	{
		concatFile = fs.createWriteStream('video.mp4', {autoClose: true});
		concatFile.on('finish', () =>
		{
			trace('concatenated segments');
		});
	}
	
	var max = 10;
	var k = 0;
	
	for (let i of master.video)
	{
		let videoURL = i.base_url;
		
		if (BASE64_MODE)
		{
			var initSegmentFile = fs.createWriteStream('segment-0.mp4', {autoClose: true});
			initSegmentFile.on('finish', () =>
			{
				trace('downloaded initial segment');
			});

			var initSegmentBinary = atob(i.__extern__init_segment);
			initSegmentFile.write(initSegmentBinary);
			initSegmentFile.end();

			if (CONCATENATE_MODE)
			{
				concatFile.write(initSegmentBinary);
			}
		}
		else
		{
			downloadSegment(baseURL, videoURL, i.init_segment);
		}
		
//		for (let j of i.segments)
//		{
//			downloadSegment(baseURL, videoURL, j);
//		}
		
//		INTERVAL_NUM = setInterval(__interval__downloadSegment, REQUEST_INTERVAL, baseURL, videoURL, i.segments);
	}
})();