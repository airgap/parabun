import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount, afterUpdate } from 'svelte';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<canvas class="svelte-70s021"></canvas> <div class="info svelte-70s021"><p>click the canvas</p> <label><input type="checkbox"/> show hue</label> <!></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let hue = $.mutable_source(0);
	let show_hue = $.mutable_source(false);
	let canvas = $.mutable_source();
	let ctx;

	onMount(() => {
		ctx = $.get(canvas).getContext('2d');
	});

	afterUpdate(() => {
		if ($.get(canvas) !== null) {
			ctx.fillStyle = `hsl(${$.get(hue)}, 100%, 40%)`;
			ctx.fillRect(0, 0, $.get(canvas).width, $.get(canvas).height);
		}
	});

	$.init();

	var fragment = root();
	var canvas_1 = $.first_child(fragment);

	$.bind_this(canvas_1, ($$value) => $.set(canvas, $$value), () => $.get(canvas));

	var div = $.sibling(canvas_1, 2);
	var label = $.sibling($.child(div), 2);
	var input = $.child(label);

	$.remove_input_defaults(input);
	$.next();
	$.reset(label);

	var node = $.sibling(label, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `hue is ${$.get(hue) ?? ''}`));
			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if ($.get(show_hue)) $$render(consequent);
		});
	}

	$.reset(div);
	$.event('click', canvas_1, () => $.set(hue, $.get(hue) + 10));
	$.bind_checked(input, () => $.get(show_hue), ($$value) => $.set(show_hue, $$value));
	$.append($$anchor, fragment);
	$.pop();
}