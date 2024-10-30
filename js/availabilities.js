/* Embedded Availabilities 1.0.10
 * Copyright (c) 2013 Inn Style Ltd | Ian Tearle @iantearle
 *
 * Changelog
 * =========
 * 6-9-13
 * Added descriptive error message and link to full calendar
 * Extended default template with a book now link
 *
 * 18-9-13
 * Fixed calendar timings to show available days the next year
 * - Added view calendar link and associated styling
 * - Disabled click on past dates
 *
 * 6-1-14
 * Moved calendar HTML to parent container of input
 *
 *
 */

var isDateInputSupported = function() {
		var elem = document.createElement('input');
		elem.setAttribute('type', 'date');
		elem.value = 'InnStyle';
		return (elem.type == 'date' && elem.value != 'InnStyle');
	};
/*
    datepickr
    Copyright (c) 2012
*/
var datepickr = (function() {
	var datepickrs = [],
		that = this,
		currentDate = new Date(),
		date = {
			current: {
				year: function() {
					return currentDate.getFullYear();
				},
				month: {
					integer: function() {
						return currentDate.getMonth();
					},
					string: function(full, months) {
						var date = currentDate.getMonth();
						return monthToStr(date, full, months);
					}
				},
				day: function() {
					return currentDate.getDate();
				}
			},
			month: {
				string: function(full, currentMonthView, months) {
					var date = currentMonthView;
					return monthToStr(date, full, months);
				},
				numDays: function(currentMonthView, currentYearView) { /* checks to see if february is a leap year otherwise return the respective # of days */
					return (currentMonthView == 1 && !(currentYearView & 3) && (currentYearView % 1e2 || !(currentYearView % 4e2))) ? 29 : daysInMonth[currentMonthView];
				}
			}
		},
		daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		buildCache = [],
		handlers = {
			calendarClick: function(e) {
				if (e.target.className) {
					if(e.target.parentNode.className === 'InnStyle-past') {
						return;
					}
					switch (e.target.className) {
						case 'InnStyle-prev-month':
						case 'InnStyle-prevMonth':
							this.currentMonthView--;
							if (this.currentMonthView < 0) {
								this.currentYearView--;
								this.currentMonthView = 11;
							}
							rebuildCalendar.call(this);
							break;
						case 'InnStyle-next-month':
						case 'InnStyle-nextMonth':
							this.currentMonthView++;
							if (this.currentMonthView > 11) {
								this.currentYearView++;
								this.currentMonthView = 0;
							}
							rebuildCalendar.call(this);
							break;
						case 'InnStyle-day':
							this.element.value = (!isDateInputSupported()) ? formatDate(new Date(this.currentYearView, this.currentMonthView, e.target.innerHTML).getTime(), this.config) : new Date(Date.UTC(this.currentYearView, this.currentMonthView, e.target.innerHTML)).toISOString().substring(0, 10);
							this.element.className = this.element.className + ' selected';
							this.close();
							break;
						default:
							this.element.value = (!isDateInputSupported()) ? formatDate(new Date(this.currentYearView, this.currentMonthView, e.target.innerHTML).getTime(), this.config) : new Date(Date.UTC(this.currentYearView, this.currentMonthView, e.target.innerHTML)).toISOString().substring(0, 10);
							this.element.className = this.element.className + ' selected';
							this.close();
							break;
					}

				}
			},
			documentClick: function(e) {
				if (e.target != this.element && e.target != this.calendar) {
					var parentNode = e.target.parentNode;
					if (parentNode != this.calender) {
						while (parentNode != this.calendar) {
							parentNode = parentNode.parentNode;
							if (parentNode === null) {
								this.close();
								break;
							}
						}
					}
				}
			}
		};

	function formatDate(milliseconds, config) {
		var formattedDate = '',
			dateObj = new Date(milliseconds),
			format = {
				d: function() {
					var day = format.j();
					return (day < 10) ? '0' + day : day;
				},
				D: function() {
					return config.weekdays[format.w()].substring(0, 3);
				},
				j: function() {
					return dateObj.getDate();
				},
				l: function() {
					return config.weekdays[format.w()];
				},
				S: function() {
					return config.suffix[format.j()] || config.defaultSuffix;
				},
				w: function() {
					return dateObj.getDay();
				},
				F: function() {
					return monthToStr(format.n(), true, config.months);
				},
				m: function() {
					var month = format.n() + 1;
					return (month < 10) ? '0' + month : month;
				},
				M: function() {
					return monthToStr(format.n(), false, config.months);
				},
				n: function() {
					return dateObj.getMonth();
				},
				Y: function() {
					return dateObj.getFullYear();
				},
				y: function() {
					return format.Y().toString().substring(2, 4);
				}
			},
			formatPieces = config.dateFormat.split('');
		foreach(formatPieces, function(formatPiece, index) {
			if (format[formatPiece] && formatPieces[index - 1] != '\\') {
				formattedDate += format[formatPiece]();
			} else {
				if (formatPiece != '\\') {
					formattedDate += formatPiece;
				}
			}
		});
		return formattedDate;
	}

	function foreach(items, callback) {
		var i = 0,
			x = items.length;
		for (i; i < x; i++) {
			if (callback(items[i], i) === false) {
				break;
			}
		}
	}

	function addEvent(element, eventType, callback) {
		if (element.addEventListener) {
			element.addEventListener(eventType, callback, false);
		} else if (element.attachEvent) {
			var fixedCallback = function(e) {
					e = e || window.event;
					e.preventDefault = (function(e) {
						return function() {
							e.returnValue = false;
						};
					})(e);
					e.stopPropagation = (function(e) {
						return function() {
							e.cancelBubble = true;
						};
					})(e);
					e.target = e.srcElement;
					callback.call(element, e);
				};
			element.attachEvent('on' + eventType, fixedCallback);
		}
	}

	function removeEvent(element, eventType, callback) {
		if (element.removeEventListener) {
			element.removeEventListener(eventType, callback, false);
		} else if (element.detachEvent) {
			element.detachEvent('on' + eventType, callback);
		}
	}

	function buildNode(nodeName, attributes, content, style) {
		var element;
		if (!(nodeName in buildCache)) {
			buildCache[nodeName] = document.createElement(nodeName);
		}
		element = buildCache[nodeName].cloneNode(false);
		if (attributes !== undefined) {
			for (var attribute in attributes) {
				element[attribute] = attributes[attribute];
			}
		}
		if (content !== undefined) {
			if (typeof(content) == 'object') {
				element.appendChild(content);
			} else {
				element.innerHTML = content;
			}
		}
		return element;
	}

	function monthToStr(date, full, months) {
		return ((full === true) ? months[date] : ((months[date].length > 3) ? months[date].substring(0, 3) : months[date]));
	}

	function isToday(day, currentMonthView, currentYearView) {
		return day == date.current.day() && currentMonthView == date.current.month.integer() && currentYearView == date.current.year();
	}

	function buildWeekdays(weekdays) {
		var weekdayHtml = document.createDocumentFragment();
		foreach(weekdays, function(weekday) {
			weekdayHtml.appendChild(buildNode('th', {}, weekday.substring(0, 2)));
		});
		return weekdayHtml;
	}

	function rebuildCalendar() {
		while (this.calendarBody.hasChildNodes()) {
			this.calendarBody.removeChild(this.calendarBody.lastChild);
		}
		var firstOfMonth = new Date(this.currentYearView, this.currentMonthView, 1).getDay(),
			numDays = date.month.numDays(this.currentMonthView, this.currentYearView);
		this.currentMonth.innerHTML = date.month.string(this.config.fullCurrentMonth, this.currentMonthView, this.config.months) + ' ' + this.currentYearView;
		this.calendarBody.appendChild(buildDays(firstOfMonth, numDays, this.currentMonthView, this.currentYearView));
	}

	function buildCurrentMonth(config, currentMonthView, currentYearView, months) {
		return buildNode('span', {
			className: 'InnStyle-current-month'
		}, date.month.string(config.fullCurrentMonth, currentMonthView, months) + ' ' + currentYearView);
	}

	function buildMonths(config, currentMonthView, currentYearView) {
		var months = buildNode('div', {
			className: 'InnStyle-months'
		}),
			prevMonth = buildNode('span', {
				className: 'InnStyle-prev-month'
			}, buildNode('span', {
				className: 'InnStyle-prevMonth'
			}, '&lt;')),
			nextMonth = buildNode('span', {
				className: 'InnStyle-next-month'
			}, buildNode('span', {
				className: 'InnStyle-nextMonth'
			}, '&gt;'));
		months.appendChild(prevMonth);
		months.appendChild(nextMonth);
		return months;
	}

	function buildDays(firstOfMonth, numDays, currentMonthView, currentYearView) {
		var calendarBody = document.createDocumentFragment(),
			row = buildNode('tr'),
			dayCount = 0,
			i; /* print out previous month's "days" */
		for (i = 1; i <= firstOfMonth; i++) {
			row.appendChild(buildNode('td', null, '&nbsp;'));
			dayCount++;
		}
		for (i = 1; i <= numDays; i++) { /* if we have reached the end of a week, wrap to the next line */
			if (dayCount == 7) {
				calendarBody.appendChild(row);
				row = buildNode('tr');
				dayCount = 0;
			}
			var previousDayClassName =
			(i < date.current.day() && currentMonthView == date.current.month.integer() && currentYearView == date.current.year() || currentMonthView < date.current.month.integer() && currentYearView == date.current.year()) ? {
				className: 'InnStyle-past'
			} : null;
			var todayClassName = isToday(i, currentMonthView, currentYearView) ? {
				className: 'InnStyle-today'
			} : previousDayClassName;
			row.appendChild(buildNode('td', todayClassName, buildNode('span', {
				className: 'InnStyle-day'
			}, i)));
			dayCount++;
		} /* if we haven't finished at the end of the week, start writing out the "days" for the next month */
		for (i = 1; i <= (7 - dayCount); i++) {
			row.appendChild(buildNode('td', null, '&nbsp;'));
		}
		calendarBody.appendChild(row);
		return calendarBody;
	}

	function buildCalendar() {
		var firstOfMonth = new Date(this.currentYearView, this.currentMonthView, 1).getDay(),
			numDays = date.month.numDays(this.currentMonthView, this.currentYearView),
			self = this;
		var inputLeft = 0,
			inputTop = 0,
			obj = this.element;
		if (obj.offsetParent) {
			do {
				inputLeft += obj.offsetLeft;
				inputTop += obj.offsetTop;
			} while (obj == obj.offsetParent);
		}
		var calendarContainer = buildNode('div', {
			className: 'InnStyle-calendar'
		});
		calendarContainer.style.cssText = 'display: none; position: absolute; top: ' + (inputTop + this.element.offsetHeight) + 'px; left: ' + inputLeft + 'px; z-index: 100; background: white; border:solid #cfcfcf 1px;';
		this.currentMonth = buildCurrentMonth(this.config, this.currentMonthView, this.currentYearView, this.config.months);
		var months = buildMonths(this.config, this.currentMonthView, this.currentYearView);
		months.appendChild(this.currentMonth);
		var calendar = buildNode('table', null, buildNode('thead', null, buildNode('tr', {
			className: 'InnStyle-weekdays'
		}, buildWeekdays(this.config.weekdays))));
		this.calendarBody = buildNode('tbody');
		this.calendarBody.appendChild(buildDays(firstOfMonth, numDays, this.currentMonthView, this.currentYearView));
		calendar.appendChild(this.calendarBody);
		calendarContainer.appendChild(months);
		calendarContainer.appendChild(calendar);

		this.element.parentNode.appendChild(calendarContainer);

		addEvent(calendarContainer, 'click', function(e) {
			handlers.calendarClick.call(self, e);
		});
		return calendarContainer;
	}
	return function(elementId, userConfig) {
		var self = this;
		this.element = document.getElementById(elementId);
		this.config = {
			fullCurrentMonth: true,
			dateFormat: 'F jS, Y',
			weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
			suffix: {
				1: 'st',
				2: 'nd',
				3: 'rd',
				21: 'st',
				22: 'nd',
				23: 'rd',
				31: 'st'
			},
			defaultSuffix: 'th'
		};
		this.currentYearView = date.current.year();
		this.currentMonthView = date.current.month.integer();
		if (userConfig) {
			for (var key in userConfig) {
				if (this.config.hasOwnProperty(key)) {
					this.config[key] = userConfig[key];
				}
			}
		}
		this.documentClick = function(e) {
			handlers.documentClick.call(self, e);
		};
		this.open = function(e) {
			addEvent(document, 'click', self.documentClick);
			foreach(datepickrs, function(datepickr) {
				if (datepickr != self) {
					datepickr.close();
				}
			});
			self.calendar.style.top = (e.target.offsetHeight + 20) + 'px';
			self.calendar.style.left = e.target.offsetLeft+ 'px';
			self.calendar.style.display = 'block';
		};
		this.close = function() {
			removeEvent(document, 'click', self.documentClick);
			self.calendar.style.display = 'none';
		};
		this.calendar = buildCalendar.call(this);
		datepickrs.push(this);
		if (this.element.nodeName == 'INPUT') {
			addEvent(this.element, 'focus', this.open);
		} else {
			addEvent(this.element, 'click', this.open);
		}
	};
})();
/*
	InnStyle (widget)
	Copyright (c) 2013
	Ian Tearle @iantearle
*/
(InnStyle = function(s, o) {
	if (!s && !o) {
		return;
	}
	var c = s + o,
		startDate, endDate, api = {
			basic: 'https://{{domain}}.innstyle.co.uk/availabilities.js',
			steps: 'https://{{domain}}.innstyle.co.uk/availabilities.js?duration=duration%5Bstart_date%5D%3D{{start_date}}%26duration%5Bend_date%5D%3D{{end_date}}',
			full: 'https://{{domain}}.innstyle.co.uk/rooms.js?f=a'
		},
		options = {
			basic: false,
			full: false,
			start_date: startDate || {},
			end_date: endDate || {},
			domain: s,
			target: null,
			branding: true,
			custom: false,
			height: false,
			success: function() {},
			templates: {
				base: '<div class="InnStyle-t-rooms"><div class="InnStyle-h"><img src="{{domain}}{{logo}}" width="100" /><h1>{{title}}</h1><p class="InnStyle-lead"><span class="InnStyle-book-total">&nbsp;{{total}}&nbsp;&nbsp;</span>Available rooms.</p></div><div class="InnStyle-t-r-c">{{innstyle}}</div><div class="InnStyle-form-actions"><a href="{{url}}" class="InnStyle-btn">Book a room</a></div></div>',
				room: '<div class="InnStyle-t-r-room"><img src="{{domain}}{{bookable_image}}" class="InnStyle-img" /><div class="InnStyle-r-descr"><h2>{{bookable_name}}</h2>{{bookable_descr}}<p><a href="{{book}}">Book Now</a><p></div></div>',
				error: ''
			}
		},
		ext = function(o1, o2) {
			for (var key in o2) {
				if (key in o1) {
					if (o1[key] && o1[key].constructor == Object) {
						ext(o1[key], o2[key]);
					} else {
						o1[key] = o2[key];
					}
				}
			}
		},
		htmlUnescape = function(value){
		    return String(value)
		        .replace(/&quot;/g, '"')
		        .replace(/&#39;/g, "'")
		        .replace(/&lt;/g, '<')
		        .replace(/&gt;/g, '>')
		        .replace(/&amp;/g, '&');
		},
		toHTML = function(json) {
			var dets = '',
				j = 0,
				link = 'https://{{domain}}.innstyle.co.uk/availabilities?duration=duration%5Bstart_date%5D%3D{{start_date}}%26duration%5Bend_date%5D%3D{{end_date}}',
				url = (options.basic ? render(api.basic, options) : ((options.full ? render(api.full, options) : render(link, options)))),
				total = json[0].rooms.length,
				domain = render('https://{{domain}}.innstyle.co.uk/', options);
			for (var det in json) {
				json[det].index = ++j;
				json[det].title = json[det].bookable_owner_name;
				json[det].logo = json[det].bookable_owner_logo;
			}
			for (var i = 0; i < total; i++) {
				json[det].rooms[i].book = url;
				json[det].rooms[i].domain = domain;
				json[det].rooms[i].bookable_descr = htmlUnescape(json[det].rooms[i].bookable_descr);
				dets += render(options.templates.room, json[det].rooms[i]);
			}
			if (options.height !== false) {
				options.templates.base = options.templates.base.replace(/\{\{innstyle\}\}/g, '<div style="overflow-x:hidden;overflow-y:scroll;height:' + options.height + ';">{{innstyle}}</div>');
			}
			return render(options.templates.base, {
				innstyle: dets,
				title: json[det].title,
				logo: json[det].logo,
				domain: domain,
				url: url,
				total: total
			});
		},
		render = function(tpl, data) {
			var output = tpl,
				dotData = function(d, dotKey) {
					var invert = '';
					if (dotKey.indexOf("!") > -1) {
						dotKey = dotKey.replace(/!/ig, '');
						invert = '!';
					}
					try {
						val = eval(invert + "d['" + dotKey.split('.').join("']['") + "']");
					} catch (e) {
						val = '';
					}
					return val;
				},
				matches = tpl.match(/\{\{[^}}]*\}\}/igm);
			for (var i = 0; i < matches.length; ++i) {
				var m = matches[i],
					val = dotData(data, matches[i].replace(/\{\{|\}\}/ig, '')) || '';
				output = output.replace(new RegExp(m, 'igm'), val);
			}
			return output;
		},
		addStyle = function(css) {
			var head = document.getElementsByTagName('head')[0];
		    var s = document.createElement('style');
		    s.type = 'text/css';
		    if (s.styleSheet) {   // IE
		        s.styleSheet.cssText = css;
		    } else {                // the world
		        s.appendChild(document.createTextNode(css));
		    }
		    head.appendChild(s);
		},
		inputStart = function(form) {
			var sId = 'InnStyle-t-start-'+InnStyle.requests,
				sIdDiv = document.createElement('div'),
				sIdLabel = document.createElement('label'),
				sIdControls = document.createElement('div'),
				formStart = document.createElement('input');
			formStart.id = sId;
			formStart.type = (!isDateInputSupported()) ? 'text' : 'date';
			sIdLabel.innerHTML = 'Arrival Date';
			sIdControls.className = 'InnStyle-t-controls';
			sIdDiv.className = 'InnStyle-t-i';
			sIdLabel.htmlFor = sId;
			sIdDiv.appendChild(sIdLabel);
			sIdDiv.appendChild(sIdControls);
			sIdControls.appendChild(formStart);
			form.appendChild(sIdDiv);
			new datepickr(sId, {
				dateFormat: 'd/m/Y'
			});
			return formStart;
		},
		inputEnd = function(form) {
			var eId = 'InnStyle-t-end-'+InnStyle.requests,
				eIdDiv = document.createElement('div'),
				eIdLabel = document.createElement('label'),
				eIdControls = document.createElement('div'),
				inputEnd = document.createElement('input');
			inputEnd.id = eId;
			inputEnd.type = (!isDateInputSupported()) ? 'text' : 'date';
			eIdLabel.innerHTML = 'Departure Date';
			eIdControls.className = 'InnStyle-t-controls';
			eIdDiv.className = 'InnStyle-t-i';
			eIdLabel.htmlFor = eId;
			eIdDiv.appendChild(eIdLabel);
			eIdDiv.appendChild(eIdControls);
			eIdControls.appendChild(inputEnd);
			form.appendChild(eIdDiv);
			new datepickr(eId, {
				'dateFormat': 'd/m/Y'
			});
			return inputEnd;
		},
		submit = function(form) {
			var submit = document.createElement('button');
			submit.id ='InnStyle-t-s';
			submit.type = 'submit';
			submit.innerHTML = 'Check Availability';
			form.appendChild(submit);
			return submit;
		},
		skip = function(form) {
			var skip = document.createElement('a');
				skip.id = 'InnStyle-t-skip';
				skip.href = 'https://'+options.domain + '.innstyle.co.uk';
				var linkText = document.createTextNode("Browse calendar");
				skip.appendChild(linkText);
				form.appendChild(skip);
			return skip;
		},
		remove = function(id) {
			return (elem = document.getElementById(id)).parentNode.removeChild(elem);
		},
		scriptc = function(a, b) {
			var date = b.substring(15),
				dateId = document.querySelectorAll('*[id^="InnStyleScript_"]'),
				__d = document,
				__h = __d.getElementsByTagName("body")[0],
				s = __d.createElement("script");
			s.src = a;
			s.id = b;
			__h.appendChild(s);
			for (var i = 0; i < dateId.length; i++) {
				if (dateId[i].id.substring(15) < date) {
					remove(dateId[i].id);
				}
			}
		},
		form = function() {
			InnStyle.requests = (InnStyle.requests === undefined ? 1 : InnStyle.requests + 1);
			var h, x, y, z, build, get = document.createElement('script'),
				div = document.createElement('div'),
				img = document.createElement('img'),
				c = document.createElement('div'),
				f = document.createElement('form'),
				callkey = 'callback' + InnStyle.requests,
				script = document.scripts[document.scripts.length - 1],
				style = (options.full) ? 'InnStyle-f' : '';
			div.id = "InnStyle-t-" + InnStyle.requests;
			div.className = style;
			img.src = "http://developer.innstyle.co.uk/assets/innstyle.png";
			img.height = 50;
			img.width = 50;
			img.className = "InnStyle-brand";
			c.id = "InnStyle-c-" + InnStyle.requests;
			build = function(s, o) {
				get.id = "InnStyleJs" + 1;
				if(o) {
					options.start_date = o.start_date;
					options.end_date = o.end_date;
				}
				var url = (options.basic ? render(api.basic, options) : ((options.full ? render(api.full, options) : render(api.steps, options))));
				script.parentNode.insertBefore(div, script);
				get.src = url + '&callback=InnStyle.' + callkey;
				scriptc(get.src, 'InnStyleScript_' + new Date().getTime());
			};
			InnStyle[callkey] = function(json) {
				document.getElementById('InnStyle-t-s').disabled = false;
				if(json[0].error) {
					var error = json[0].error,
						calendar = 'https://'+options.domain + '.innstyle.co.uk';
					console.log(error);
					c.innerHTML = '<p>Sorry, it looks like we\'re full on those dates. Why not take a look at our <a href="'+ calendar +'">calendar</a>?</p>';
					div.appendChild(c);
					return;
				}
				c.innerHTML = toHTML(json);
				json = json.results ? json.results : json;
				if(document.getElementById('InnStyle-c') === null) {
					div.appendChild(c);
				} else {
					div.removeChild(c);
					InnStyle.callback1.call(this, json);
				}
			};
			if(options.target === null) {
				script.parentNode.insertBefore(div, script);
			} else {
				var d = document.getElementById(options.target);
				if (d === null) {
					alert('Target not found, have you put the div#target after the script?');
					return;
				}
				d.appendChild(div.innerHTML);
			}
			if(options.branding !== false) {
				div.appendChild(img);
			}
			if(options.custom !== true) {
				addStyle('div[id^="InnStyle-t"]{background-color:#fff;border:solid #f3f3f3 1px;padding:10px;margin:20px 0;width:auto;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#333}div[id^="InnStyle-t"] form{border-top:solid #f3f3f3 1px;padding-top:15px;margin-top:-11px;margin-bottom:0}div[id^="InnStyle-c"]{margin-top:10px}a#InnStyle-t-skip{color:#cb5034;text-decoration:none;display:block;padding-right:12px;margin-top:5px;margin-right:10px;text-align:right;background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFBJREFUeNpi/P//PwM6OM3JiCLIiE0RumLGUxwMKKpMv/9nhCkAscEKQYpApsEwkM8PxB+Q+KiK0BXAMIZJyCbA2EwMRACiFGH4DptPAQIMAKC9W56t7evtAAAAAElFTkSuQmCC) right center no-repeat;}button#InnStyle-t-s{display:inline-block;padding:12px 20px 8px;margin-bottom:5px;font-size:14px;line-height:20px;text-align:center;vertical-align:middle;-webkit-border-radius:22px;-moz-border-radius:22px;border-radius:22px;border:0;cursor:pointer;background:#cb5034;color:#fff;width:100%}button#InnStyle-t-s:disabled{background-color:#ccc}img.InnStyle-brand{width:50px;height:50px;margin-bottom:16px}div.InnStyle-t-i{width:auto;position:relative}div.InnStyle-t-i label{font-size:16px;line-height:1}div.InnStyle-t-i input[type=text],div.InnStyle-t-i input[type=date]{width:100%;height:auto;-moz-box-sizing:border-box;box-sizing:border-box;background-color:#fff;border:1px solid #ccc;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);-moz-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);-webkit-transition:border linear 0.2s,box-shadow linear .2s;-moz-transition:border linear 0.2s,box-shadow linear .2s;-o-transition:border linear 0.2s,box-shadow linear .2s;transition:border linear 0.2s,box-shadow linear .2s;display:inline-block;padding:4px 6px;margin-bottom:10px;font-size:14px;line-height:20px;color:#555;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;vertical-align:middle;*overflow:visible}div.InnStyle-t-i input[type=text]:focus,div.InnStyle-t-i input[type=date]:focus{border-color:#6dbda8;outline:0;outline:thin dotted 9px;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 8px #6dbda8;-moz-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 8px #6dbda8;box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 8px #6dbda8}input[type=date]::-webkit-outer-spin-button{-webkit-appearance:none}::-webkit-calendar-picker-indicator{display:none}input[type=date]::-webkit-calendar-picker-indicator{background:none}.InnStyle-t-rooms h1,.InnStyle-t-rooms h2{margin:10px 0;font-weight:400;line-height:20px;color:#404947}.InnStyle-t-rooms .InnStyle-form-actions{padding:19px 20px 20px;margin-top:20px;background-color:#f2f9f8;border-top:1px solid #e5e5e5;border-radius:0 0 5px 5px;overflow:hidden}.InnStyle-t-rooms .InnStyle-form-actions .InnStyle-btn{display:block;padding:12px 20px 8px;margin-bottom:0;font-size:14px;line-height:20px;text-align:center;vertical-align:middle;-webkit-border-radius:22px;-moz-border-radius:22px;border-radius:22px;border:0;cursor:pointer;background:#cb5034;color:#fff;text-decoration:none}.InnStyle-t-rooms h1{font-size:45px;font-family:"Times New Roman",Times,serif;font-style:italic;line-height:1}.InnStyle-t-r-room{border-bottom:1px solid #eee;margin-bottom:20px;overflow:hidden}.InnStyle-t-r-room img{float:left;margin:0 30px 20px 0}@media (max-width: 767px){.InnStyle-t-r-room img{float:none}}.InnStyle-t-r-room h2{font-size:30px;text-transform:uppercase;line-height:1}.InnStyle-lead{margin:0 0 20px;font-size:21px;font-weight:200;line-height:30px}.InnStyle-book-total{color:#cb5034;font-weight:700}.InnStyle-calendar{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:.9em;background-color:#EEE;color:#333;border:1px solid #DDD;-moz-border-radius:4px;-webkit-border-radius:4px;border-radius:4px;padding:.2em;width:18em}.InnStyle-calendar .InnStyle-months{background-color:#fff;-moz-border-radius:4px;-webkit-border-radius:4px;border-radius:4px;color:#666;padding:.2em;text-align:center;font-weight:700;text-transform:uppercase}.InnStyle-calendar .InnStyle-prev-month,.InnStyle-calendar .InnStyle-next-month{padding:0;-webkit-transition:background,.5s;-moz-transition:background,.5s;-o-transition:background,.5s;transition:background,.5s}.InnStyle-calendar .InnStyle-prev-month{float:left}.InnStyle-calendar .InnStyle-next-month{float:right}.InnStyle-calendar .InnStyle-current-month{margin:0 auto}.InnStyle-calendar .InnStyle-months .InnStyle-prev-month,.InnStyle-calendar .InnStyle-months .InnStyle-next-month{color:#666;text-decoration:none;padding:0 .4em .2em;-moz-border-radius:4px;-webkit-border-radius:4px;border-radius:4px;cursor:pointer}.InnStyle-calendar .InnStyle-months .InnStyle-prev-month:hover,.InnStyle-calendar .InnStyle-months .InnStyle-next-month:hover{background-color:#98c5b9;color:#fff}.InnStyle-calendar table{border-collapse:collapse;padding:0;font-size:.8em;width:100%}.InnStyle-calendar th{text-align:center}.InnStyle-calendar td{width:14.3%;border-collapse:collapse;color:#333;display:table-cell;font-size:12px;height:30px;padding-bottom:0;padding-left:0;padding-right:0;padding-top:0;vertical-align:middle;line-height:14px}.InnStyle-calendar td span{display:block;color:#fff;background-color:#6dbda8;text-decoration:none;cursor:pointer;padding:8px 4px;-webkit-transition:background,.5s;-moz-transition:background,.5s;-o-transition:background,.5s;transition:background,.5s}.InnStyle-calendar td span:hover{color:#fff;background-color:#98c5b9}.InnStyle-calendar td.InnStyle-past span{background-color:#efefef;color:#959595;cursor:not-allowed}.InnStyle-f .InnStyle-h{display:none}');
			}
			if(options.basic === true && options.full === false) {
				build(s);
			} else if(options.full === true || options.basic === true) {
				build(s);
			} else {
				div.appendChild(f);
				x = inputStart(f);
				y = inputEnd(f);
				z = submit(f);
				zz = skip(f);
				h = function(e) {
					document.getElementById('InnStyle-t-s').disabled = true;
					e.preventDefault();
					if ((!x.value && !y.value) || (x.value && !y.value) || (!x.value && y.value) || (x.value > y.value)) {
						document.getElementById('InnStyle-t-s').disabled = false;
						alert('You didnt choose any dates');
					} else {
						var o = {};
						o.start_date = x.value;
						o.end_date = y.value;
						ext(options, o);
						build(s, o);
					}
				};
				z.addEventListener('click', h, false);
			}
		},
		checkSubDomain = function(str) {
			var pattern = new RegExp('^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');
			if(!pattern.test(str)) {
				if(str.match(/[^-a-zA-Z]/)) {
					alert("Looks like you have invalid characters in your subdomain.");
					return false;
				}
				return true;
			} else {
				alert("Looks like you entered a URL. Please try just your subdomain.");
				return false;
			}
		},
		init = function(opts) {
			checkSubDomain(s);
			if (opts && opts !== undefined) {
				if (opts.constructor == String) {
					var a = opts.split('/'),
						b = {};
					ext(options, o);
				} else if (opts.constructor == Object) {
					ext(options, opts);
				}
			}
		};
	this.create = function() {
		init(o);
		form();
	};
	if (this.constructor != InnStyle) {
		new InnStyle(s, o).create();
	}
}).call();
