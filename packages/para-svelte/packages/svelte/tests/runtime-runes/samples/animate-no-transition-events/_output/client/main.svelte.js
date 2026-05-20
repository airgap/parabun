import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { flip } from "svelte/animate";

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<button>reverse</button> <!>`, 1);

export default function Main($$anchor) {
	let numbers = $.proxy([0, 1]);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 24, () => numbers, (num) => num, ($$anchor, num) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, num));
		$.event('introstart', div, () => console.log("intro start"));
		$.event('outrostart', div, () => console.log("outro start"));
		$.event('introend', div, () => console.log("intro end"));
		$.event('outroend', div, () => console.log("outro end"));
		$.animation(div, () => flip, () => ({ duration: 100 }));
		$.append($$anchor, div);
	});

	$.delegated('click', button, () => numbers.reverse());
	$.append($$anchor, fragment);
}

$.delegate(['click']);