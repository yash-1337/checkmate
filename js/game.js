var board,
  boardEl = $('#board'),
  game = new Chess();

var player;
var skillLevel = 3;
var mode = 'Normal';

var hintsUsed = 0;

var promoteTo = 'q';

var stockfish = new Worker('/checkmate/js/stockfish.js');

var CheckIfGameEnded = function () {
  UpdateGameMoves();
  $("#pgn").scrollTop($('#pgn-div').prop('scrollHeight'));
  var turn = game.turn() == 'w' ? 'white' : 'black';
  if (turn === "white") {
    if (game.in_checkmate()) {
      $('#GameOver').modal();
      if (turn === player) {
        $("#gameover-title").text("You Lost!");
      }
    }
  } else if (turn === "black") {
    if (game.in_checkmate()) {
      $('#GameOver').modal();
      if (turn === player) {
        $("#gameover-title").text("You Lost!");
      }
    }
  }
  if (game.in_draw()) {
    $('#GameOver').modal();
    $("#gameover-title").text("It's A Draw!");
  }


};

var removeHighlights = function (color) {
  boardEl.find('.square-55d63')
    .removeClass('highlight-' + color);
};

var removeGreySquares = function () {
  $('#board .square-55d63').css('background', '');
};

var greySquare = function (square) {
  var squareEl = $('#board .square-' + square);

  var background = '#a9a9a9';
  if (squareEl.hasClass('black-3c85d') === true) {
    background = '#696969';
  }

  squareEl.css('background', background);
};

var onDragStart = function (source, piece, position, orientation) {
  var re = player == 'white' ? /^b/ : /^w/
  if (game.in_checkmate() === true || game.in_draw() === true ||
    piece.search(re) !== -1) {
    return false;
  }
};

var makeMove = function (oldPos, source, target) {

  var turn = game.turn() == 'w' ? 'white' : 'black';

  if (turn != player) {

    var moves = '';
    var history = game.history({
      verbose: true
    });

    for (var i = 0; i < history.length; ++i) {
      var move = history[i];
      moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
    }
    stockfish.postMessage('position startpos moves' + moves);
    console.log('position startpos moves' + moves);
    stockfish.postMessage('go depth 7');
    stockfish.onmessage = function (event) {
      var result = event.data;
      var match = result.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbk])?/);
      console.log(match);

      if (match) {

        game.move({
          from: match[1],
          to: match[2],
          promotion: match[3]
        });

        removeHighlights('hint');
        removeHighlights('last');
        boardEl.find('.square-' + match[1]).addClass('highlight-last');
        boardEl.find('.square-' + match[2]).addClass('highlight-last');

        board.position(game.fen());
        CheckIfGameEnded();

      }

    };

  }



};

var onDrop = function (source, target, piece, newPos, oldPos, orientation) {
  var turn = game.turn() == 'w' ? 'white' : 'black';
  removeGreySquares();

  debugger;
  var move;
  if (game.is_promotion(source, target)) {
    //var promote = prompt("piece:", "q");
    $('#PromotePawnModal').modal('show');
    $('#PromotePawnModal').on('hidden.bs.modal', function (e) {
      move = game.move({
        from: source,
        to: target,
        promotion: promoteTo
      });
      if (move === null) return 'snapback';
      UpdateBoard(move, source, target, turn, newPos, oldPos, orientation, piece);
      debugger;
    });
  } else {
    move = game.move({
      from: source,
      to: target
    });
    if (move === null) return 'snapback';
    UpdateBoard(move, source, target, turn, newPos, oldPos, orientation, piece);
  }

  debugger;

};

var onMoveEnd = function () {};

var onMouseoverSquare = function (square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) return;

  // highlight the square they moused over
  greySquare(square);

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
};

var onMouseoutSquare = function (square, piece) {
  removeGreySquares();
};


// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
  board.position(game.fen());
};

$("#toggle-promotion label").click(function (e) {
  switch (this.id) {
    case 'queen':
      promoteTo = 'q';
      break;
    case 'rook':
      promoteTo = 'r';
      break;
    case 'bishop':
      promoteTo = 'b';
      break;
    case 'knight':
      promoteTo = 'n';
      break;
  }

});

function UpdateBoard(move, source, target, turn, newPos, oldPos, orientation, piece) {

  removeHighlights('last');
  boardEl.find('.square-' + source).addClass('highlight-last');
  boardEl.find('.square-' + target).addClass('highlight-last');
  if (turn === "white") {
    if (game.in_checkmate()) {
      $('#GameOver').modal();
      if (turn != player) {

        $("#gameover-title").text("You Won!");
      }
    }
  } else if (turn === "black") {
    if (game.in_checkmate()) {
      $('#GameOver').modal();
      if (turn != player) {
        $("#gameover-title").text("You Won!");
      }
    }
  }
  if (game.in_draw()) {
    $('#GameOver').modal();
    $("#gameover-title").text("It's A Draw!");
  }
  var boardPosition = ChessBoard.objToFen(newPos);
  var OldPosition = ChessBoard.objToFen(oldPos);
  window.setTimeout(makeMove(OldPosition, source, target), 250);

};

function UpdateGameMoves() {
  $("#pgn").html(game.pgn({
    max_width: 5,
    newline_char: '<br />'
  }));
};

$("#toggle-levels label").click(function (e) {
  switch (this.id) {
    case 'easy':
      skillLevel = 1;
      mode = 'Easy';
      break;
    case 'normal':
      skillLevel = 3;
      mode = 'Normal';
      break;
    case 'hard':
      skillLevel = 7;
      mode = 'Hard';
      break;
  }
  console.log(skillLevel);

});

$('#PlayBtn').on('click', function () {
  player = $('#color-white').hasClass('active') ? 'white' : 'black';
  stockfish.postMessage('setoption name Skill Level value ' + skillLevel);
  var cfg = {
    draggable: true,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onMoveEnd: onMoveEnd,
    onSnapEnd: onSnapEnd,
    orientation: player
  };
  console.log(player);
  board = ChessBoard('board', cfg);
  board.start();
  game.reset();
  $('#StartBtn').css("display", "none");
  $('#UndoBtn').css("display", "inline");
  $('#NewGameBtn').css("display", "inline");

  $("#sidebar").css("display", "inline");
  $("#main-info").css("display", "none");
  $("#main-footer").css("top", "50px");
  var opponent = player == 'white' ? 'Black' : 'White';
  $("#playing-against").html("<b>Playing Against:</b> " + opponent);
  $("#computer-level").html("<b>Mode:</b> " + mode);
  $("#pgn").empty();
  $('#main').css("display", "none");
  stockfish.postMessage('uci');
  var position = board.fen();
  hintsUsed = 0;
  window.setTimeout(makeMove, 250);
});

$('#UndoBtn').on('click', function () {
  game.undo();
  removeHighlights('last');
  removeHighlights('hint');
  window.setTimeout(makeMove, 500);
  board.position(game.fen());
  game.undo();
  removeHighlights('last');
  removeHighlights('hint');
  board.position(game.fen());
  UpdateGameMoves();
});

$('#HintBtn').on('click', function () {
  if (!game.in_checkmate() || !game.in_draw()) {
    if (hintsUsed > 2) {
      $('#hintsUsedUp').modal();
    }
    if (hintsUsed <= 2) {
      var turn = game.turn() == 'w' ? 'white' : 'black';
      if (turn === player) {
        hintsUsed += 1;
        var moves = '';
        var history = game.history({
          verbose: true
        });

        for (var i = 0; i < history.length; ++i) {
          var move = history[i];
          moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
        }
        stockfish.postMessage('position startpos moves' + moves);
        console.log('position startpos moves' + moves);
        stockfish.postMessage('go depth 7');
        stockfish.onmessage = function (event) {
          var result = event.data;
          var match = result.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbk])?/);
          console.log(match);
          if (match) {
            removeHighlights('hint');
            boardEl.find('.square-' + match[1]).addClass('highlight-hint');
            boardEl.find('.square-' + match[2]).addClass('highlight-hint');
          }
        }
      }
    }


  }

});


$('#PlayAfterGameOverBtn').on('click', function () {
  $('#GameOver').modal('hide');
  $('#NewGameModal').modal('show');
});