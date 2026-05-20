import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let blah = $.prop($$props, 'blah', 12, 'hello');

	var $$exports = {
		get blah() {
			return blah();
		},

		set blah($$value) {
			blah($$value);
			$.flush();
		}
	};

	var div = root();

	$.attribute_effect(div, () => ({ ...{ class: 'foo' }, [$.CLASS]: { bar: true } }), void 0, void 0, void 0, 'svelte-70s021');

	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, blah()));
	$.append($$anchor, div);

	return $.pop($$exports);
}