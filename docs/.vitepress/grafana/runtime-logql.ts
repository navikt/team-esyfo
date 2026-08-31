export const runtimeNoiseFilter =
	"| k8s_container_name !~ `secure-logs-fluentbit|cloudsql-proxy|wonderwall|elector`";

export const runtimeErrorLevelFilter =
	"| detected_level=~`(?i)(error|critical|fatal)`";

// next-logger can expose x_isFrontend as structured metadata or only in the
// JSON line. Filter both representations while retaining non-JSON runtime logs.
export const forwardedBrowserLogFilter = `| x_isFrontend!="true"
| json forwarded_browser="x_isFrontend"
| forwarded_browser!="true"
| drop forwarded_browser, __error__, __error_details__`;

export const runtimeErrorPipeline = `${runtimeNoiseFilter}
${runtimeErrorLevelFilter}
${forwardedBrowserLogFilter}`;
