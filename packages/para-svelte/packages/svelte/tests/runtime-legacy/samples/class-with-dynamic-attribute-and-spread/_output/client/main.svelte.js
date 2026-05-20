import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let myClass = $.prop($$props, 'myClass', 12);
	let attributes = $.prop($$props, 'attributes', 28, () => ({}));

	var $$exports = {
		get myClass() {
			return myClass();
		},

		set myClass($$value) {
			myClass($$value);
			$.flush();
		},

		get attributes() {
			return attributes();
		},

		set attributes($$value) {
			attributes($$value);
			$.flush();
		}
	};

	var div = root();

	$.attribute_effect(div, () => ({
		class: myClass(),
		...attributes(),
		[$.CLASS]: { three: true }
	}));

	$.append($$anchor, div);

	return $.pop($$exports);
}