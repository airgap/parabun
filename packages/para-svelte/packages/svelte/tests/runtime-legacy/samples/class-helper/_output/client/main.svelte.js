import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let user = $.prop($$props, 'user', 12);

	function isActive(user) {
		return user.active;
	}

	var $$exports = {
		get user() {
			return user();
		},

		set user($$value) {
			user($$value);
			$.flush();
		}
	};

	var div = root();
	let classes;

	$.template_effect(($0) => classes = $.set_class(div, 1, '', null, classes, $0), [() => ({ active: isActive(user()) })]);
	$.append($$anchor, div);

	return $.pop($$exports);
}