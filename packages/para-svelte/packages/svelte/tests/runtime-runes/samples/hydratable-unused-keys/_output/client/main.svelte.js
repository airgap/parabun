import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { hydratable } from "svelte";

var root_1 = $.from_html(`<div>Loading...</div>`);
var root_2 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const unresolved_hydratable = hydratable("unused_key", () => new Promise((res, rej) => $$props.environment === 'server'
		? setTimeout(() => res('did you ever hear the tragedy of darth plagueis the wise?'), 0)
		: rej('should not run')));

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var div = root_1();

			$.append($$anchor, div);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var div_1 = root_2();
			var text = $.child(div_1, true);

			$.reset(div_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => unresolved_hydratable]);
			$.append($$anchor, div_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}