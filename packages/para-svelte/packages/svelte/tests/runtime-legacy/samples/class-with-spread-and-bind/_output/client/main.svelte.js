import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let primary = $.prop($$props, 'primary', 12, true);
	let elem = $.mutable_source();

	var $$exports = {
		get primary() {
			return primary();
		},

		set primary($$value) {
			primary($$value);
			$.flush();
		}
	};

	var div = root();

	$.attribute_effect(div, () => ({
		class: 'test-class',
		...{ role: 'button' },
		[$.CLASS]: { primary: primary() }
	}));

	$.bind_this(div, ($$value) => $.set(elem, $$value), () => $.get(elem));
	$.append($$anchor, div);

	return $.pop($$exports);
}