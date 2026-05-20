import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p><!></p>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	// bind:clientHeight on the parent is not really part of the test, just here for forwarding the value
	let clientHeight = $.prop($$props, 'clientHeight', 12);

	var $$exports = {
		get clientHeight() {
			return clientHeight();
		},

		set clientHeight($$value) {
			clientHeight($$value);
			$.flush();
		}
	};

	var p = root();
	var node = $.child(p);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(p);
	$.bind_element_size(p, 'clientHeight', clientHeight);
	$.append($$anchor, p);

	return $.pop($$exports);
}