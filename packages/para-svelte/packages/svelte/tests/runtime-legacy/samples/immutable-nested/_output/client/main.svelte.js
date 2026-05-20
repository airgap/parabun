import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let nested = $.prop($$props, 'nested', 13);

	var $$exports = {
		get nested() {
			return nested();
		},

		set nested($$value) {
			nested($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.bind_this(Nested(node, { $$legacy: true }), ($$value) => nested($$value), () => nested());
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}