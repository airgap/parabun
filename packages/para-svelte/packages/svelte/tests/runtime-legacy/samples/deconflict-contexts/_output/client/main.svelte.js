import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let components = $.prop($$props, 'components', 12);

	var $$exports = {
		get components() {
			return components();
		},

		set components($$value) {
			components($$value);
			$.flush();
		}
	};

	var ul = root();

	$.each(ul, 5, components, $.index, ($$anchor, component) => {
		var li = root_1();
		var text = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text, $.get(component)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}