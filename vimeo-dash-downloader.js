#!/usr/bin/env node

////////////////////////////////////////////////////////////////////////////////
//	
//	vimeo-dash-downloader.js
//	antonsynd
//	Downloads Vimeo videos in MPEG-DASH format
//	
//	Usage:
//		node vimeo-dash-downloader.js [OPTS] -- MDP_JSON_URL
//	
//	Options:
//		--debug=true|false	Print debug output to stdout. Default is false
//		--concat=true|false	If true, concat segments immediately into a file
//							named "[id].mp4" where [id] is the value of "id" in
//							the video object. Individual segments are not saved.
//							If false, saves the individual segments with the
//							naming scheme "[id]-segment-[segment_id].m4s" except
//							for the initializer which is an mp4. Default is
//							false
//		--output=[string]	Output directory for the downloaded files. Default
//							is the current working directory
//	
//	Arguments:
//		MDP_JSON_URL		URL of the master.json file. Play the Vimeo video
//							with the network tab of your browser's web inspector
//							open and look for "segment-[digit].m4s" requests.
//  						Find the request URL and select everything up to
//							the end of /video/[digits]/ (including this 
//							portion). (With regexes, /^(.+\/video\/\d+\/)/).
//							Append "master.json" to the end and provide the
//							whole string as the argument. This JSON file is
//							saved locally as "master.json"
//	
//	Example:
//		node vimeo-dash-downloader.js --concat=true https://skyfiregce-a.../video/463799389/master.json
//	
////////////////////////////////////////////////////////////////////////////////

(function()
{
	'use strict';
	
	const fs = require('fs');
	const http = require('http');
//	const atob = require('atob');
	const argv = require('minimist')(process.argv.slice(2),
	{
		default: {
			'concat': 'false',
			'debug': 'false',
			'base64': 'false',
			'output': './'
		},
	});
	
	const MDP_JSON_URL = argv._[0];
	const OUTPUT_DIR = argv.output;
	const CONCAT_MODE = argv.concat === 'true';
	const DEBUG_MODE = argv.debug === 'true';
	const BASE64_MODE = argv.base64 === 'true';
	
	const MDP_JSON_PATH = 'master.json';
	var videoPath;
	var baseURL;
	var videoFile;
	
	// The same as console.log, but only runs if DEBUG_MODE
	function trace()
	{
		if (DEBUG_MODE)
		{
			console.log.apply(console, arguments);
		}
	}
	
	function downloadSegments()
	{
		var mdpJSONText = fs.readFileSync(MDP_JSON_PATH, {encoding: 'utf-8'});
		var mdp;
		
		try
		{
			mdp = JSON.parse(mdpJSONText);
		}
		catch (e)
		{
			console.error(e);
			
			process.exit(1);
		}
		
		for (let i of mdp.video)
		{
			videoPath = i.id + '.mp4';
			
			if (CONCAT_MODE)
			{
				videoFile = fs.createWriteStream(videoPath);
				videoFile.on('finish', () =>
				{
					trace('concatenated segments');
				});
			}
			
			// TODO
			if (BASE64_MODE)
			{
//				var initSegmentFile = fs.createWriteStream('segment-0.mp4');
//				initSegmentFile.on('finish', () =>
//				{
//					trace('downloaded initial segment');
//				});
//
//				var initSegmentBinary = atob(i.__extern__init_segment);
//				initSegmentFile.write(initSegmentBinary);
//				initSegmentFile.end();
//
//				if (CONCATENATE_MODE)
//				{
//					concatFile.write(initSegmentBinary);
//				}
			}
			else
			{
				i.segments.unshift({
					start: 0,
					end: 0,
					url: i.init_segment,
				});
				
				downloadNextSegment(i.id, i.base_url, i.segments);
			}
		}
	}
	
	function downloadSegment(id, baseURL, videoURL, segmentURL, callback)
	{
		var segmentFile;

		if (!CONCAT_MODE)
		{
			segmentFile = fs.createWriteStream(id + '-' + segmentURL).on('finish', () =>
			{
				trace('downloaded ' + segmentURL);
			});
		}

		var request = http.get(baseURL + videoURL + segmentURL, (response) =>
		{
			if (CONCAT_MODE && videoFile)
			{
				response.pipe(videoFile, {
					end: false,
				});
			}
			else
			{
				response.pipe(segmentFile);
			}
			
			response.on('end', (e) =>
			{
				// Don't have to unpipe
				
				if (CONCAT_MODE)
				{
					trace('concatenated ' + segmentURL);
				}
				else
				{
					segmentFile.end();
				}
				
				if (callback)
				{
					// Usually, a call to retrieve the next segment
					callback(e);
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
	
	function downloadNextSegment(id, videoURL, segments)
	{
		var segment = segments.shift();
		
		if (segment)
		{
			downloadSegment(id, baseURL, videoURL, segment.url, (e) =>
			{
				downloadNextSegment(id, videoURL, segments);
			});
		}
		else
		{
			if (CONCAT_MODE && videoFile)
			{
				videoFile.end();
			}
		}
	}
	
	// Change the directory
	process.chdir(OUTPUT_DIR);
	
	// Download the MDP JSON file, don't use base64_init=1, and always through http
	var mdpJSONURL = MDP_JSON_URL.replace(/\?(?:[^=]+?=[^&]+?)*?$/g, '').replace(/^https/g, 'http');
	baseURL = mdpJSONURL.replace(/video\/(?:\d+,?)+\/.+$/g, '');
	
	var mdpJSONFile = fs.createWriteStream(MDP_JSON_PATH, {encoding: 'utf-8'}).on('finish', () =>
	{
		trace('downloaded MDP JSON file');
		downloadSegments();
	});
	
	var mdpJSONRequest = http.get(mdpJSONURL, (response) =>
	{
		response.pipe(mdpJSONFile);
		
		response.on('end', (e) =>
		{
			// Don't have to unpipe
		}).on('error', (e) =>
		{
			console.error(e);
		});
	}).on('error', (e) =>
	{
		console.error(e);
	});
})();