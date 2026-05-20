import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>Loading...</p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<p> </p> <!>`, 1);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	let y = $.prop($$props, 'y', 7);
	var $$promises = $.run([async () => void y(await $$props.deferred.promise)]);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		const pending = ($$anchor) => {
			var p_1 = root_1();

			$.append($$anchor, p_1);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_2 = root_2();
			var text_1 = $.child(p_2);

			$.reset(p_2);
			$.template_effect(() => $.set_text(text_1, `y: ${y() ?? ''}`), void 0, void 0, [$$promises[0]]);
			$.append($$anchor, p_2);
		});
	}

	$.template_effect(() => $.set_text(text, `x: ${$$props.x ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
}