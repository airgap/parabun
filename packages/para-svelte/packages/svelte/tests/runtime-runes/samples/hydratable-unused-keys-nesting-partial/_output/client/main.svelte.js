import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { hydratable } from "svelte";

var root_1 = $.from_html(`<div>Loading...</div>`);
var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<div> </div> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const partially_used_hydratable = hydratable("partially_used", () => {
		return {
			used: new Promise((res, rej) => $$props.environment === 'server'
				? setTimeout(() => res('did you ever hear the tragedy of darth plagueis the wise?'), 0)
				: rej('should not run')),

			unused: new Promise((res, rej) => $$props.environment === 'server'
				? setTimeout(() => res('no, sith daddy, please tell me'), 0)
				: rej('should not run'))
		};
	});

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div, true);

	$.reset(div);

	var node = $.sibling(div, 2);

	{
		const pending = ($$anchor) => {
			var div_1 = root_1();

			$.append($$anchor, div_1);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var div_2 = root_2();
			var text_1 = $.child(div_2, true);

			$.reset(div_2);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => partially_used_hydratable.unused]);
			$.append($$anchor, div_2);
		});
	}

	$.template_effect(($0) => $.set_text(text, $0), void 0, [() => partially_used_hydratable.used]);
	$.append($$anchor, fragment);
	$.pop();
}