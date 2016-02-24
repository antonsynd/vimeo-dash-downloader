# vimeo-dash-downloader
Downloads Vimeo videos in MPEG-DASH format

Usage:
	node vimeo-dash-downloader.js [OPTS] -- MDP_JSON_URL

Options:

	--debug=true|false	Print debug output to stdout. Default is false
	
	--concat=true|false	If true, concat segments immediately into a file
						named "[id].mp4" where [id] is the value of "id" in
						the video object. Individual segments are not saved.
						If false, saves the individual segments with the
						naming scheme "[id]-segment-[segment_id].m4s" except
						for the initializer which is an mp4. Default is
						false
						
	--output=[string]	Output directory for the downloaded files. Default
						is the current working directory

Arguments:

	MDP_JSON_URL		URL of the master.json file. Play the Vimeo video
						with the network tab of your browser's web inspector
						open and look for "segment-[digit].m4s" requests.
  						Find the request URL and select everything up to
						the end of /video/[digits]/ (including this 
						portion). (With regexes, /^(.+\/video\/\d+\/)/).
						Append "master.json" to the end and provide the
						whole string as the argument. This JSON file is
						saved locally as "master.json"

Example:

	node vimeo-dash-downloader.js --concat=true https://skyfiregce-a.../video/463799389/master.json
