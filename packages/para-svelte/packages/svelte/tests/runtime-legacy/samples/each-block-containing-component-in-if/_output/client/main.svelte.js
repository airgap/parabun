import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12);
	let fields = $.prop($$props, 'fields', 12);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		},

		get fields() {
			return fields();
		},

		set fields($$value) {
			fields($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	Nested(node, {
		get show() {
			return show();
		},

		get fields() {
			return fields();
		}
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}