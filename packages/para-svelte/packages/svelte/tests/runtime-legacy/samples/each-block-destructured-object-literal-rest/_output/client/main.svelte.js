import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let objectsArray = $.prop($$props, 'objectsArray', 12);

	var $$exports = {
		get objectsArray() {
			return objectsArray();
		},

		set objectsArray($$value) {
			objectsArray($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, objectsArray, $.index, ($$anchor, $$item) => {
		let quotedProp = () => $.get($$item)["quote"];
		let wrongQuote = () => $.get($$item)["wrong-quote"];
		let sixteen = () => $.get($$item)[16];
		let seventeen = () => $.get($$item)[10 + 7];
		let props = () => $.exclude_from_object($.get($$item), ['quote', 'wrong-quote', '16', String(10 + 7)]);
		var p = root_1();

		$.attribute_effect(p, () => ({ ...props() }));

		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `Quote: ${quotedProp() ?? ''}, Wrong Quote: ${wrongQuote() ?? ''}, 16: ${sixteen() ?? ''}, 17: ${seventeen() ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}