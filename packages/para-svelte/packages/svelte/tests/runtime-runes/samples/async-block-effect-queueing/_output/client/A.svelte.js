import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span>A</span>`);
var root = $.from_html(`<button>toggle <!></button>`);

export default function A($$anchor) {
	let open = $.state(false);
	let menuOptionsEl = $.state(null);
	var button = root();
	var node = $.sibling($.child(button));

	{
		var consequent = ($$anchor) => {
			var span = root_1();

			$.bind_this(span, ($$value) => $.set(menuOptionsEl, $$value), () => $.get(menuOptionsEl));
			$.append($$anchor, span);
		};

		$.if(node, ($$render) => {
			if ($.get(open)) $$render(consequent);
		});
	}

	$.reset(button);
	$.delegated('click', button, () => $.set(open, !$.get(open)));
	$.append($$anchor, button);
}

$.delegate(['click']);