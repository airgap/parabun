import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<d class="svelte-xyz"></d> <e class="svelte-xyz"></e> <f class="svelte-xyz"></f>`, 1);
var root = $.from_html(`<x class="svelte-xyz"><y class="svelte-xyz"><z class="svelte-xyz"></z> <!></y></x> <c class="svelte-xyz"></c> <g class="svelte-xyz"><h class="svelte-xyz"><i class="svelte-xyz"></i></h></g> <j class="svelte-xyz"><k class="svelte-xyz"></k></j>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var x = $.first_child(fragment);
	var y = $.child(x);
	var node = $.sibling($.child(y), 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();

			$.next(4);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (foo) $$render(consequent);
		});
	}

	$.reset(y);
	$.reset(x);
	$.next(6);
	$.append($$anchor, fragment);
}