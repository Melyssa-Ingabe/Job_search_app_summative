Job Search Agreggator App

A modern web application I built that aggregates job listings from multiple sources, allowing users to search, filter, and bookmark jobs all in one place.

# Features

Aggregated job search: Pulls jobs from both Adzuna and JSearch APIs for comprehensive results
Advanced filtering: Users can filter by location, job type, and salary range
Smart sorting: Results can be sorted by date posted, salary, or relevance
Bookmark system: Jobs can be saved for later review and persist across sessions
Responsive design: The application works seamlessly on desktop, tablet, and mobile devices
Error handling: Error handling for API failures and network issues
Real-time searching: Results update as users type their search queries

## Live application
The application is deployed and accessible at these URLs:

Load Balancer: http://44.203.149.195/
Web Server 1: http://18.234.78.213/
Web Server 2: http://98.93.185.24/

### Technologies used

Frontend: HTML, CSS, JavaScript
APIs: Adzuna Job Search API, JSearch (RapidAPI)
Server: Nginx web server
Load Balancing: Nginx reverse proxy with least_conn algorithm
Deployment: Ubuntu servers on AWS

#### Installation

Clone the repo
Configure the API keys
Run locally

##### Deployment process

I deployed this application across three servers: two web servers and one load balancer.
Web Server Deployment (Web01 & Web02)

For each web server, I followed these steps:

1.Connected to the server
2.Installed Nginx
3.Created the application directory
4.Uploaded my files
5.Configured nginx and enabled the site

For the load balancer:

1.Connected to the load balancer
2.Installed nginx
3.Created load balancer configuration
4.Enabled & tested

###### Functionality testing

Searched for "software engineer" in "New York" - returned relevant results
Applied filters for full-time and remote positions - filtering worked correctly
Sorted results by salary (high to low) - sorting functioned as expected
Bookmarked several jobs - bookmarks persisted after page refresh
Tested error handling by disconnecting from the internet - graceful error messages displayed

###### How it works

When a user searches for jobs, my application:

Sends parallel requests to both Adzuna and JSearch APIs
Combines the results from both sources
Removes duplicate listings based on job title and company
Caches results for 5 minutes to reduce API calls and improve performance

Filtering System

Location: Filters jobs by city or state
Job Type: Options include Full-time, Part-time, Contract, and Remote
Salary Range: Users can set a minimum salary threshold
Date Posted: Filters for jobs posted within the last 24 hours, 7 days, or 30 days

Bookmark System

Save jobs that users are interested in
Persist bookmarks across browser sessions
Allow users to quickly access saved jobs from the Bookmarks tab

##### Challenges faced

Both APIs have rate limits on their free tiers, which could cause issues with multiple searches.
Initial searches for specific cities were returning jobs from other locations

#### API Documentation

Adzuna API: https://developer.adzuna.com/docs
Rate Limit: 1000 calls/month (free tier)
Usage: Primary job listings source

JSearch API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
Rate Limit: 500 requests/month (free tier)
Usage: Secondary job listings source for broader coverage

### Credits

Adzuna for providing their job search API
RapidAPI/JSearch for additional job listing data
Font Awesome for the icon library
Google Fonts for the Inter font family

## Author

Melyssa Ingabe Mbayire
GitHub: Melyssa-Ingabe
Email: m.mbayire@alustudent.com
Project: Playing around with API - Web Infrastructure Summative

